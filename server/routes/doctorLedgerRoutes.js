const express = require('express');
const router = express.Router();
const DoctorLedger = require('../models/DoctorLedger');

// Create ledger entry (credit = revenue, debit = handover)
router.post('/', async (req, res) => {
  try {
    const { doctorId, type, amount, description, date, source, tokenId, createdBy } = req.body || {};
    if (!doctorId) return res.status(400).json({ error: 'doctorId is required' });
    if (!type || !['credit','debit'].includes(type)) return res.status(400).json({ error: 'type must be credit or debit' });
    const amt = Number(amount);
    if (!(amt >= 0)) return res.status(400).json({ error: 'amount must be a non-negative number' });

    const entry = await DoctorLedger.create({
      doctorId: String(doctorId),
      type,
      amount: amt,
      description: description || (type === 'credit' ? 'Revenue' : 'Handover'),
      date: date ? new Date(date) : new Date(),
      source: source || 'manual',
      tokenId: tokenId || undefined,
      createdBy: createdBy || undefined,
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List ledger entries with optional filters
router.get('/', async (req, res) => {
  try {
    const { doctorId, from, to, type, page = '0', limit = '0' } = req.query || {};
    const filter = {};
    if (doctorId) filter.doctorId = String(doctorId);
    if (type && ['credit','debit'].includes(type)) filter.type = type;
    if (from && to) {
      const start = new Date(from);
      const end = new Date(to); end.setHours(23,59,59,999);
      filter.date = { $gte: start, $lte: end };
    }

    const pageNum = Math.max(parseInt(page, 10) || 0, 0);
    const limitNum = Math.max(parseInt(limit, 10) || 0, 0);

    if (pageNum > 0 && limitNum > 0) {
      const total = await DoctorLedger.countDocuments(filter);
      const items = await DoctorLedger.find(filter).sort({ date: -1, createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean();
      return res.json({ data: items, total, page: pageNum, pageSize: limitNum });
    }

    const items = await DoctorLedger.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Summary for a doctor
router.get('/summary', async (req, res) => {
  try {
    const { doctorId } = req.query || {};
    if (!doctorId) return res.status(400).json({ error: 'doctorId is required' });

    const agg = await DoctorLedger.aggregate([
      { $match: { doctorId: String(doctorId) } },
      { $group: { _id: '$doctorId', credit: { $sum: { $cond: [{ $eq: ['$type','credit'] }, '$amount', 0] } }, debit: { $sum: { $cond: [{ $eq: ['$type','debit'] }, '$amount', 0] } } } },
      { $project: { _id: 0, doctorId: '$_id', credit: 1, debit: 1, balance: { $subtract: ['$credit', '$debit'] } } }
    ]);

    const summary = agg[0] || { doctorId: String(doctorId), credit: 0, debit: 0, balance: 0 };
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
