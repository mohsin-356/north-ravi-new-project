const express = require('express');
const router = express.Router();
const Token = require('../models/Token');

function startEndOfCurrentMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// GET /api/overview/monthly
router.get('/monthly', async (_req, res) => {
  try {
    const { start, end } = startEndOfCurrentMonth();

    const [totalTokens, distinctPatients, revenueAgg] = await Promise.all([
      Token.countDocuments({ dateTime: { $gte: start, $lte: end } }),
      Token.distinct('patientId', { dateTime: { $gte: start, $lte: end } }),
      Token.aggregate([
        { $match: { dateTime: { $gte: start, $lte: end } } },
        {
          $project: {
            finalFee: { $ifNull: ['$finalFee', null] },
            feeNum: { $convert: { input: '$fee', to: 'double', onError: 0, onNull: 0 } },
            discountNum: { $convert: { input: '$discount', to: 'double', onError: 0, onNull: 0 } },
          }
        },
        {
          $addFields: {
            feeNet: { $ifNull: ['$finalFee', { $subtract: ['$feeNum', '$discountNum'] }] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$feeNet' },
          },
        },
      ]),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const totalPatients = Array.isArray(distinctPatients) ? distinctPatients.length : 0;

    res.json({ start, end, totalTokens, totalPatients, totalRevenue });
  } catch (err) {
    console.error('[overview] monthly error', err);
    res.status(500).json({ message: 'Failed to load monthly overview' });
  }
});

module.exports = router;
