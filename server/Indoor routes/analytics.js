const express = require('express');
const router = express.Router();

const Sale = require('../Indoor models/Sale');
const Expense = require('../Indoor models/Expense');
const Purchase = require('../Indoor models/Purchase');
const Medicine = require('../Indoor models/Medicine');

function resolveDateRange(query) {
  const { interval = 'month', year, month, from, to } = query || {};
  let startDate, endDate;
  if (from && to) {
    startDate = new Date(from);
    endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);
  } else if (interval === 'year' && year) {
    startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    endDate = new Date(`${year}-12-31T23:59:59.999Z`);
  } else if (interval === 'month' && year && month) {
    startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setMilliseconds(-1);
  } else {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  return { startDate, endDate };
}

// GET /api/indoor/analytics/overview
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate } = resolveDateRange(req.query);

    const [salesAgg] = await Sale.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]);
    const totalRevenue = salesAgg?.totalRevenue || 0;
    const totalSalesCount = salesAgg?.count || 0;

    const [expenseAgg] = await Expense.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
    ]);
    const totalExpenses = expenseAgg?.totalExpenses || 0;

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    let totalPurchases = 0;
    {
      const [pAgg] = await Purchase.aggregate([
        { $match: { status: 'approved', purchaseDate: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, totalPurchases: { $sum: '$totalPurchaseAmount' } } },
      ]);
      totalPurchases = pAgg?.totalPurchases || 0;
    }

    const [soldAgg] = await Sale.aggregate([
      { $unwind: '$items' },
      { $group: { _id: null, itemsSold: { $sum: '$items.quantity' } } },
    ]);
    const totalItemsSold = soldAgg?.itemsSold || 0;

    const topProductsRaw = await Sale.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.medicineId', name: { $first: '$items.medicineName' }, quantity: { $sum: '$items.quantity' } } },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]);
    const topProducts = topProductsRaw.map((p) => ({ id: p._id, name: p.name, quantity: p.quantity }));
    const topProductsCount = topProducts.reduce((sum, p) => sum + p.quantity, 0);

    const activeCustomers = await Sale.distinct('customerId', { date: { $gte: startDate, $lte: endDate } });
    const activeCustomersCount = activeCustomers.filter(Boolean).length;
    const newCustomersCount = 0; // Customer model removed; no new customer metric

    const creditCustomers = await Sale.distinct('customerId', { paymentMethod: 'credit' });
    const cashCustomers = await Sale.distinct('customerId', { paymentMethod: 'cash' });

    res.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      totalPurchases,
      totalSales: totalRevenue,
      totalProfit: netProfit,
      totalItemsSold,
      creditCustomers: creditCustomers.filter(Boolean).length,
      cashCustomers: cashCustomers.filter(Boolean).length,
      topProducts,
      topProductsCount,
      activeCustomers: activeCustomersCount,
      newCustomers: newCustomersCount,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics overview' });
  }
});

// GET /api/indoor/analytics/sales-trend
router.get('/sales-trend', async (req, res) => {
  try {
    const { startDate, endDate } = resolveDateRange(req.query);
    const salesDaily = await Sale.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, sales: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]);
    const expenseDaily = await Expense.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, expenses: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]);
    const expenseMap = Object.fromEntries(expenseDaily.map(e => [e._id, e.expenses]));
    const trend = salesDaily.map(s => ({ date: s._id, sales: s.sales, profit: s.sales - (expenseMap[s._id] || 0) }));
    res.json(trend);
  } catch (err) { res.status(500).json({ message: 'Failed to fetch sales trend' }); }
});

// GET /api/indoor/analytics/category-sales
router.get('/category-sales', async (_req, res) => {
  try {
    const sales = await Sale.aggregate([{ $unwind: '$items' }, { $group: { _id: '$items.medicineId', quantity: { $sum: '$items.quantity' } } }]);
    if (sales.length === 0) return res.json([]);
    const idToQty = {}; const ids = sales.map(s => { idToQty[String(s._id)] = s.quantity; return s._id; });
    const meds = await Medicine.find({ _id: { $in: ids } }, 'category').lean();
    const catMap = {};
    meds.forEach(m => { const cat = m.category || 'Other'; const qty = idToQty[String(m._id)] || 0; catMap[cat] = (catMap[cat] || 0) + qty; });
    const result = Object.entries(catMap).map(([category, value]) => ({ category, value }));
    res.json(result);
  } catch (err) { res.status(500).json({ message: 'Failed to fetch category sales' }); }
});

// GET /api/indoor/analytics/product-sales
router.get('/product-sales', async (_req, res) => {
  try {
    const data = await Sale.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.medicineName', value: { $sum: '$items.quantity' } } },
      { $sort: { value: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: '$_id', value: 1 } },
    ]);
    const total = data.reduce((s, p) => s + p.value, 0);
    const top = data[0] || { name: '-', value: 0 };
    res.json({ total, top, data });
  } catch (err) { res.status(500).json({ message: 'Failed to fetch product sales' }); }
});

// credit-company-summary removed (credit functionality disabled)

module.exports = router;
