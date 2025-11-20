const express = require('express');
const mongoose = require('mongoose');
const Sale = require('../Pharmacy  models/Sale');
const Purchase = require('../Pharmacy  models/Purchase');
const Expense = require('../Pharmacy  models/Expense');

const router = express.Router();

function parseRange(req){
  const from = req.query.from ? new Date(req.query.from) : new Date(new Date().toISOString().slice(0,10));
  const to = req.query.to ? new Date(req.query.to) : new Date(new Date().toISOString().slice(0,10));
  // include entire 'to' day
  to.setHours(23,59,59,999);
  return { from, to };
}

router.get('/pharmacy', async (req, res) => {
  try {
    const { from, to } = parseRange(req);
    const dateMatch = { $gte: from, $lte: to };

    const [salesAgg] = await Sale.aggregate([
      { $match: { $or: [{ date: dateMatch }, { createdAt: dateMatch }] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$total', '$totalAmount'] } } } },
    ]);

    const [purchAgg] = await Purchase.aggregate([
      { $match: { $or: [{ purchaseDate: dateMatch }, { date: dateMatch }, { createdAt: dateMatch }] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$totalPurchaseAmount', { $ifNull: ['$total', '$amount'] }] } } } },
    ]);

    const [expAgg] = await Expense.aggregate([
      { $match: { $or: [{ date: dateMatch }, { createdAt: dateMatch }] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]);

    const totalSales = salesAgg?.total || 0;
    const totalPurchases = purchAgg?.total || 0;
    const totalExpenses = expAgg?.total || 0;
    const totalProfit = totalSales - totalPurchases - totalExpenses;

    res.json({ from, to, totalSales, totalPurchases, totalExpenses, totalProfit });
  } catch (e) {
    console.error('[finance] pharmacy summary error', e);
    res.status(500).json({ message: 'Failed to compute pharmacy summary' });
  }
});

// Detailed lab finance: totals + recent transactions
router.get('/lab/details', async (req, res) => {
  try {
    const { from, to } = parseRange(req);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const names = new Set(collections.map(c => c.name));

    const transactions = [];
    let totalIncome = 0;
    let totalExpenses = 0;

    // Income from Samples (compute from tests when totalAmount is 0/missing)
    if (names.has('samples')) {
      const sampleAgg = await db.collection('samples').aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $lookup: { from: 'tests', localField: 'tests', foreignField: '_id', as: 'testDocs' } },
        { $addFields: {
            computedAmount: {
              $cond: [
                { $gt: ['$totalAmount', 0] },
                '$totalAmount',
                { $reduce: { input: '$testDocs', initialValue: 0, in: { $add: ['$$value', { $ifNull: ['$$this.price', 0] }] } } }
              ]
            }
          }
        },
        { $project: { createdAt: 1, patientName: 1, computedAmount: 1 } },
        { $sort: { createdAt: -1 } },
        { $limit: 100 }
      ]).toArray();

      for (const s of sampleAgg) {
        const amt = Number(s.computedAmount || 0);
        totalIncome += amt;
        transactions.push({
          _id: s._id,
          date: s.createdAt,
          title: s.patientName ? `Lab Test - Patient: ${s.patientName}` : 'Lab Test',
          category: 'Test Revenue',
          type: 'income',
          amount: amt,
          ref: s._id?.toString?.() || null,
        });
      }
    } else if (names.has('testorders')) {
      // Fallback: infer income from testorders
      const docs = await db.collection('testorders')
        .find({ createdAt: { $gte: from, $lte: to } })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
      for (const d of docs) {
        const amt = Number(d.paidAmount ?? d.totalAmount ?? 0);
        totalIncome += amt;
        transactions.push({
          _id: d._id,
          date: d.createdAt,
          title: d.patientName ? `Lab Test - Patient: ${d.patientName}` : 'Lab Test',
          category: 'Test Revenue',
          type: 'income',
          amount: amt,
          ref: d._id?.toString?.() || null,
        });
      }
    }

    // Expenses from Finance collection
    if (names.has('finances')) {
      const expenseDocs = await db.collection('finances')
        .find({ type: 'expense', date: { $gte: from, $lte: to } })
        .sort({ date: -1 })
        .limit(100)
        .toArray();
      for (const e of expenseDocs) {
        const amt = Number(e.amount || 0);
        totalExpenses += amt;
        transactions.push({
          _id: e._id,
          date: e.date || e.createdAt,
          title: e.description || e.title || 'Expense',
          category: e.category || 'Expense',
          type: 'expense',
          amount: amt,
          ref: e.reference || e.ref || null,
        });
      }
    }

    // Sort combined transactions latest first and trim to 100
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limited = transactions.slice(0, 100);

    const net = totalIncome - totalExpenses;
    res.json({ from, to, totals: { income: totalIncome, expenses: totalExpenses, net }, transactions: limited });
  } catch (e) {
    console.error('[finance] lab details error', e);
    res.status(500).json({ message: 'Failed to compute lab details' });
  }
});

router.get('/lab', async (req, res) => {
  try {
    const { from, to } = parseRange(req);
    const db = mongoose.connection.db;
    // Try to infer from lab collections if present
    const collections = await db.listCollections().toArray();
    const names = new Set(collections.map(c => c.name));
    let totalRevenue = 0;
    if (names.has('lab_finance')){
      const coll = db.collection('lab_finance');
      const agg = await coll.aggregate([
        { $match: { date: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray();
      totalRevenue = agg[0]?.total || 0;
    } else if (names.has('testorders')){
      const coll = db.collection('testorders');
      const agg = await coll.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$paidAmount', { $ifNull: ['$totalAmount', 0] }] } } } }
      ]).toArray();
      totalRevenue = agg[0]?.total || 0;
    }
    res.json({ from, to, totalRevenue });
  } catch (e) {
    console.error('[finance] lab summary error', e);
    res.status(500).json({ message: 'Failed to compute lab summary' });
  }
});

router.get('/hospital', async (req, res) => {
  try {
    const { from, to } = parseRange(req);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const names = new Set(collections.map(c => c.name));
    let totalBilling = 0;
    if (names.has('invoices')){
      const agg = await db.collection('invoices').aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } } } }
      ]).toArray();
      totalBilling = agg[0]?.total || 0;
    }
    res.json({ from, to, totalBilling });
  } catch (e) {
    console.error('[finance] hospital summary error', e);
    res.status(500).json({ message: 'Failed to compute hospital summary' });
  }
});

router.get('/', async (req, res) => {
  try {
    // Optional combined endpoint
    const [{ data: pharmacy } = { data: null }] = [{}];
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed' });
  }
});

module.exports = router;
