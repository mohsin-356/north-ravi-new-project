const express = require('express');
const router = express.Router();
const Sale = require('../Pharmacy  models/Sale');
const DailySale = require('../Pharmacy  models/DailySale');
const MonthlySale = require('../Pharmacy  models/MonthlySale');
const Inventory = require('../Pharmacy  models/Inventory');
const Customer = require('../Pharmacy  models/Customer');

// Get all sales
router.get('/', async (req, res) => {
  try {
    // Optional filters: billNo, medicine, from, to, payment
    // Optional pagination: limit, page (1-based)
    const { billNo, medicine, from, to, payment } = req.query || {};
    const limit = Math.min(parseInt(req.query.limit, 10) || 0, 500); // safeguard
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = limit ? (page - 1) * limit : 0;

    const query = {};
    if (billNo) {
      query.billNo = { $regex: String(billNo), $options: 'i' };
    }
    if (payment) {
      query.paymentMethod = { $regex: String(payment), $options: 'i' };
    }
    // Date range
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.date.$lte = toDate;
      }
    }
    // Medicine name filter (matches saved medicineName within items)
    if (medicine) {
      query.items = { $elemMatch: { medicineName: { $regex: String(medicine), $options: 'i' } } };
    }

    let q = Sale.find(query).sort({ date: -1 });
    if (limit) {
      q = q.skip(skip).limit(limit);
    }
    const sales = await q.exec();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a sale by short bill number (printed on receipt)
router.get('/by-bill/:billNo', async (req, res) => {
  try {
    const { billNo } = req.params;
    if (!billNo) return res.status(400).json({ error: 'billNo is required' });
    const sale = await Sale.findOne({ billNo }).lean();
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new sale
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    // Basic validation
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ message: 'items array is required', error: 'items array is required' });
    }
    for (const [idx, it] of body.items.entries()) {
      if (!it.medicineId) return res.status(400).json({ message: `items[${idx}].medicineId is required`, error: `items[${idx}].medicineId is required` });
      if (typeof it.quantity !== 'number' || it.quantity <= 0) return res.status(400).json({ message: `items[${idx}].quantity must be a positive number`, error: `items[${idx}].quantity must be a positive number` });
      if (typeof it.price !== 'number' || it.price < 0) return res.status(400).json({ message: `items[${idx}].price must be a number`, error: `items[${idx}].price must be a number` });
    }
    if (typeof body.totalAmount !== 'number' || body.totalAmount < 0) {
      return res.status(400).json({ message: 'totalAmount must be a non-negative number', error: 'totalAmount must be a non-negative number' });
    }

    // Normalize fields accepted by schema
    const normalized = {
      items: body.items.map(it => ({
        medicineId: it.medicineId,
        quantity: it.quantity,
        price: it.price,
        medicineName: it.medicineName
      })),
      billNo: body.billNo,
      totalAmount: body.totalAmount,
      paymentMethod: body.paymentMethod || 'cash',
      customerId: body.customerId,
      customerName: body.customerName,
      date: body.date ? new Date(body.date) : new Date()
    };

    const newSale = new Sale(normalized);
    const savedSale = await newSale.save();

    // Update inventory for each item in the sale
    for (const item of savedSale.items) {
      await Inventory.findByIdAndUpdate(item.medicineId, {
        $inc: { stock: -item.quantity },
      });
    }

    // Get start of today for daily sales aggregation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update daily sales
    await DailySale.findOneAndUpdate(
      { date: today },
      {
        $inc: { totalAmount: savedSale.totalAmount, numberOfSales: 1 },
        $push: { sales: savedSale._id },
      },
      { upsert: true, new: true }
    );

    // Get month in YYYY-MM format for monthly sales aggregation
    const month = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2);

    // Update monthly sales
    await MonthlySale.findOneAndUpdate(
      { month: month },
      {
        $inc: { totalAmount: savedSale.totalAmount, numberOfSales: 1 },
        $push: { sales: savedSale._id },
      },
      { upsert: true, new: true }
    );

    // If credit sale, add credit history to customer
    if (savedSale.paymentMethod === 'credit' && savedSale.customerId) {
      try {
        await Customer.findByIdAndUpdate(savedSale.customerId, {
          $push: {
            creditHistory: {
              medicines: savedSale.items.map(it => ({ medicineId: it.medicineId, quantity: it.quantity, price: it.price })),
              amount: savedSale.totalAmount,
              date: savedSale.date,
              paid: false
            }
          }
        });
        // --- UPDATE CUSTOMER TOTALS & LOYALTY ---
        const points = Math.floor(savedSale.totalAmount / 100); // 1 point per 100 PKR
        await Customer.findByIdAndUpdate(savedSale.customerId, {
          $inc: { totalPurchases: savedSale.totalAmount, loyaltyPoints: points }
        }).catch(err => console.error('Failed to update customer totals', err));
        // --- END CUSTOMER TOTALS & LOYALTY UPDATE ---
      } catch (err) {
        console.error('Failed to add credit history:', err);
      }
    }

    res.status(201).json(savedSale);
  } catch (err) {
    console.error('Failed to create sale:', err);
    res.status(400).json({ message: err.message, error: err.message });
  }
});

// Get dashboard summary
router.get('/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Aggregate cash / credit totals for today
    const [cashTodayAgg] = await Sale.aggregate([
      { $match: { date: { $gte: today, $lt: tomorrow }, paymentMethod: 'cash' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const [creditTodayAgg] = await Sale.aggregate([
      { $match: { date: { $gte: today, $lt: tomorrow }, paymentMethod: 'credit' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Aggregate cash / credit totals for current month
    const [cashMonthAgg] = await Sale.aggregate([
      { $match: { date: { $gte: monthStart, $lt: nextMonthStart }, paymentMethod: 'cash' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const [creditMonthAgg] = await Sale.aggregate([
      { $match: { date: { $gte: monthStart, $lt: nextMonthStart }, paymentMethod: 'credit' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Existing overall daily / monthly summaries
    const todaySale = await DailySale.findOne({ date: today });
    const monthKey = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2);
    const monthSale = await MonthlySale.findOne({ month: monthKey });

    res.json({
      today: todaySale || { totalAmount: 0, numberOfSales: 0 },
      month: monthSale || { totalAmount: 0, numberOfSales: 0 },
      cashToday: cashTodayAgg ? cashTodayAgg.total : 0,
      creditToday: creditTodayAgg ? creditTodayAgg.total : 0,
      cashMonth: cashMonthAgg ? cashMonthAgg.total : 0,
      creditMonth: creditMonthAgg ? creditMonthAgg.total : 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get all daily sales
router.get('/daily', async (req, res) => {
  try {
    const dailySales = await DailySale.find().sort({ date: -1 });
    res.json(dailySales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all monthly sales
router.get('/monthly', async (req, res) => {
  try {
    const monthlySales = await MonthlySale.find().sort({ month: -1 });
    res.json(monthlySales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent sales (latest 5)
router.get('/recent', async (req, res) => {
  try {
    const sales = await Sale.find()
      .sort({ date: -1 })
      .limit(5)
      .populate('items.medicineId', 'name')
      .lean();

    const formatted = sales.map(s => ({
      id: s._id,
      medicine: s.items.map(it => it.medicineName || it.medicineId?.name || 'Unknown').join(', '),
      customer: s.customerName || s.customerId || 'Walk-in',
      amount: s.totalAmount,
      date: new Date(s.date).toLocaleDateString(),
      time: new Date(s.date).toLocaleTimeString()
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
