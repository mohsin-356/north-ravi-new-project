const express = require('express');
const router = express.Router();

const Sale = require('../Pharmacy  models/Sale');
const Expense = require('../Pharmacy  models/Expense');
const Customer = require('../Pharmacy  models/Customer');
const Purchase = require('../Pharmacy  models/Purchase');
const Medicine = require('../Pharmacy  models/Medicine');

/**
 * Helper: resolve date range from query
 */
function resolveDateRange(query) {
  const { interval = 'month', year, month, from, to } = query;
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
    // default: current month
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  return { startDate, endDate };
}

/* --------------------------------------------------
   GET /api/analytics/overview
   Returns KPI numbers for the dashboard
---------------------------------------------------*/
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate } = resolveDateRange(req.query);

    // Total revenue (sales)
    const [salesAgg] = await Sale.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]);
    const totalRevenue = salesAgg?.totalRevenue || 0;
    const totalSalesCount = salesAgg?.count || 0;

    // Total expenses
    const [expenseAgg] = await Expense.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
    ]);
    const totalExpenses = expenseAgg?.totalExpenses || 0;

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Total purchases (approved only, within range)
    let totalPurchases = 0;
    {
      const [pAgg] = await Purchase.aggregate([
        { $match: { status: 'approved', purchaseDate: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, totalPurchases: { $sum: '$totalPurchaseAmount' } } },
      ]);
      totalPurchases = pAgg?.totalPurchases || 0;
    }

    // Total items sold within range
    const [soldAgg] = await Sale.aggregate([
      { $unwind: '$items' },
      { $group: { _id: null, itemsSold: { $sum: '$items.quantity' } } },
    ]);
    const totalItemsSold = soldAgg?.itemsSold || 0;

    // Top products (by quantity sold)
    const topProductsRaw = await Sale.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.medicineId',
          name: { $first: '$items.medicineName' },
          quantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]);

    const topProducts = topProductsRaw.map((p) => ({ id: p._id, name: p.name, quantity: p.quantity }));
    const topProductsCount = topProducts.reduce((sum, p) => sum + p.quantity, 0);

    // Active customers (unique) & new customers
    const activeCustomers = await Sale.distinct('customerId', { date: { $gte: startDate, $lte: endDate } });
    const activeCustomersCount = activeCustomers.filter((c) => !!c).length;

    const newCustomersCount = await Customer.countDocuments({ customerSince: { $gte: startDate, $lte: endDate } });

    // Credit vs Cash customer counts (unique)
    const creditCustomers = await Sale.distinct('customerId', { paymentMethod: 'credit' });
    const cashCustomers = await Sale.distinct('customerId', { paymentMethod: 'cash' });
    const creditCustomerCount = creditCustomers.filter(c=>!!c).length;
    const cashCustomerCount = cashCustomers.filter(c=>!!c).length;

    res.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      totalPurchases,
      totalSales: totalRevenue, // alias for existing UI
      totalProfit: netProfit,
      totalItemsSold,
      creditCustomers: creditCustomerCount,
      cashCustomers: cashCustomerCount,
      topProducts, // detailed list
      topProductsCount,
      activeCustomers: activeCustomersCount,
      newCustomers: newCustomersCount,
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ message: 'Failed to fetch analytics overview' });
  }
});

/* --------------------------------------------------
   GET /api/analytics/sales-trend
   Returns daily sales & profit arrays for charts
---------------------------------------------------*/
router.get('/sales-trend', async (req, res) => {
  try {
    const { startDate, endDate } = resolveDateRange(req.query);

    // Daily sales
    const salesDaily = await Sale.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' },
          },
          sales: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Daily expenses
    const expenseDaily = await Expense.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' },
          },
          expenses: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Merge to form profit
    const expenseMap = expenseDaily.reduce((acc, e) => ({ ...acc, [e._id]: e.expenses }), {});

    const trend = salesDaily.map((s) => ({
      date: s._id,
      sales: s.sales,
      profit: s.sales - (expenseMap[s._id] || 0),
    }));

    res.json(trend);
  } catch (err) {
    console.error('Sales trend error:', err);
    res.status(500).json({ message: 'Failed to fetch sales trend' });
  }
});

/* --------------------------------------------------
   GET /api/analytics/category-sales
   Returns pie-chart data: [{ category, value }]
---------------------------------------------------*/
router.get('/category-sales', async (req, res) => {
  try {
    // Aggregate sales quantities by medicineId first
    const sales = await Sale.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.medicineId',
          quantity: { $sum: '$items.quantity' },
        },
      },
    ]);

    if (sales.length === 0) return res.json([]);

    // Fetch categories for medicineIds
    const idToQty = {};
    const ids = sales.map((s) => {
      idToQty[s._id.toString()] = s.quantity;
      return s._id;
    });

    const meds = await Medicine.find({ _id: { $in: ids } }, 'category').lean();

    // Group by category
    const catMap = {};
    meds.forEach((m) => {
      const cat = m.category || 'Other';
      const qty = idToQty[m._id.toString()] || 0;
      catMap[cat] = (catMap[cat] || 0) + qty;
    });

    const result = Object.entries(catMap).map(([category, value]) => ({ category, value }));
    res.json(result);
  } catch (err) {
    console.error('Category sales error', err);
    res.status(500).json({ message: 'Failed to fetch category sales' });
  }
});

/* --------------------------------------------------
   GET /api/analytics/product-sales
   Returns product wise sold units array [{ name, value }]
---------------------------------------------------*/
router.get('/product-sales', async (req, res) => {
  try {
    const data = await Sale.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.medicineName',
          value: { $sum: '$items.quantity' },
        },
      },
      { $sort: { value: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          name: '$_id',
          value: 1,
        },
      },
    ]);

    const total = data.reduce((s, p) => s + p.value, 0);
    const top = data[0] || { name: '-', value: 0 };
    res.json({ total, top, data });
  } catch (err) {
    console.error('Product sales error', err);
    res.status(500).json({ message: 'Failed to fetch product sales' });
  }
});

/* --------------------------------------------------
   GET /api/analytics/credit-company-summary
   Returns total credit sales and breakdown by company within selected range
   Query param: range = daily | weekly | monthly | yearly (default: monthly)
---------------------------------------------------*/
router.get('/credit-company-summary', async (req, res) => {
  try {
    const { range = 'monthly' } = req.query;
    // Determine start & end dates based on range
    const now = new Date();
    let startDate, endDate;
    endDate = new Date(now); // now
    switch (range) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6); // last 7 days inclusive
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1); // Jan 1 current year
        break;
      default: // monthly
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    // Ensure endDate to end of day
    endDate.setHours(23, 59, 59, 999);

    // Aggregate credit sales grouped by company; compute outstanding = totalAmount - paidAmount
    const summary = await Sale.aggregate([
      {
        $match: {
          paymentMethod: 'credit',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      // compute remaining balance per sale
      {
        $addFields: {
          paidAmountSafe: { $ifNull: ['$paidAmount', 0] },
        }
      },
      {
        $addFields: {
          remaining: {
            $cond: [
              { $gt: [{ $subtract: ['$totalAmount', '$paidAmountSafe'] }, 0] },
              { $subtract: ['$totalAmount', '$paidAmountSafe'] },
              0,
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'pharmacy_customer',
          let: { custId: '$customerId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$custId'] },
                    { $eq: [{ $toString: '$_id' }, '$$custId'] },
                  ],
                },
              },
            },
          ],
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$customer.companyName', 'Unspecified'] },
          creditSale: { $sum: '$totalAmount' },
          outstanding: { $sum: '$remaining' },
          customers: { $addToSet: '$customer._id' },
        },
      },
      {
        $project: {
          _id: 0,
          companyName: { $ifNull: ['$_id', 'Unspecified'] },
          creditSale: 1,
          outstanding: 1,
          customerCount: { $size: '$customers' },
        },
      },
      { $sort: { creditSale: -1 } },
    ]);

    const totalCreditSale = summary.reduce((s, c) => s + (c.creditSale || 0), 0);
    const totalOutstandingCredit = summary.reduce((s, c) => s + (c.outstanding || 0), 0);
    res.json({ totalCreditSale, totalOutstandingCredit, companies: summary });
  } catch (err) {
    console.error('Credit company summary error', err);
    res.status(500).json({ message: 'Failed to fetch credit company summary' });
  }
});

module.exports = router; 