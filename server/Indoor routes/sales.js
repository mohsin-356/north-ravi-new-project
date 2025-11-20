const express = require('express');
const router = express.Router();
const Sale = require('../Indoor models/Sale');
const DailySale = require('../Indoor models/DailySale');
const MonthlySale = require('../Indoor models/MonthlySale');
const Inventory = require('../Indoor models/Inventory');
const AddStock = require('../Indoor models/AddStock');
const { logAudit } = require('../Indoor middleware/audit');

// GET /api/indoor/sales
router.get('/', async (req, res) => {
  try {
    const { billNo, medicine, from, to, payment } = req.query || {};
    const limit = Math.min(parseInt(req.query.limit, 10) || 0, 500);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = limit ? (page - 1) * limit : 0;

    const query = {};
    if (billNo) query.billNo = { $regex: String(billNo), $options: 'i' };
    if (payment) query.paymentMethod = { $regex: String(payment), $options: 'i' };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) { const d = new Date(to); d.setHours(23,59,59,999); query.date.$lte = d; }
    }
    if (medicine) query.items = { $elemMatch: { medicineName: { $regex: String(medicine), $options: 'i' } } };

    let q = Sale.find(query).sort({ date: -1 });
    if (limit) q = q.skip(skip).limit(limit);
    const sales = await q.exec();
    res.json(sales);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET by bill
router.get('/by-bill/:billNo', async (req, res) => {
  try {
    const sale = await Sale.findOne({ billNo: req.params.billNo }).lean();
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/indoor/sales
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    if (!Array.isArray(body.items) || body.items.length === 0) return res.status(400).json({ message: 'items array is required', error: 'items array is required' });
    for (const [idx, it] of body.items.entries()) {
      if (!it.medicineId) return res.status(400).json({ message: `items[${idx}].medicineId is required`, error: `items[${idx}].medicineId is required` });
      if (typeof it.quantity !== 'number' || it.quantity <= 0) return res.status(400).json({ message: `items[${idx}].quantity must be a positive number`, error: `items[${idx}].quantity must be a positive number` });
      if (typeof it.price !== 'number' || it.price < 0) return res.status(400).json({ message: `items[${idx}].price must be a number`, error: `items[${idx}].price must be a number` });
    }
    if (typeof body.totalAmount !== 'number' || body.totalAmount < 0) return res.status(400).json({ message: 'totalAmount must be a non-negative number', error: 'totalAmount must be a non-negative number' });

    const normalized = {
      items: body.items.map(it => ({ medicineId: it.medicineId, quantity: it.quantity, price: it.price, medicineName: it.medicineName })),
      billNo: body.billNo,
      totalAmount: body.totalAmount,
      paymentMethod: body.paymentMethod || 'cash',
      customerId: body.customerId,
      customerName: body.customerName,
      date: body.date ? new Date(body.date) : new Date()
    };
    // Generate bill number if not provided: B-YYMMDD-###
    if (!normalized.billNo) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = ('0' + (now.getMonth() + 1)).slice(-2);
      const dd = ('0' + now.getDate()).slice(-2);
      const prefix = `B-${yy}${mm}${dd}-`;
      let seq = 1;
      try {
        const last = await Sale.find({ billNo: { $regex: `^${prefix}\\d+$` } }).sort({ billNo: -1 }).limit(1).lean();
        if (last && last.length) {
          const m = String(last[0].billNo || '').match(/-(\d+)$/);
          if (m) seq = (parseInt(m[1], 10) || 0) + 1;
        }
      } catch {}
      normalized.billNo = `${prefix}${String(seq).padStart(3, '0')}`;
    }
    const savedSale = await new Sale(normalized).save();

    // Update stock: Prefer AddStock units; sync Inventory aggregate by medicine name; fallback to Inventory by ID
    for (const item of savedSale.items) {
      const qty = Number(item.quantity || 0);
      let handled = false;
      try {
        const asDoc = await AddStock.findById(item.medicineId).populate('medicine');
        if (asDoc) {
          const before = asDoc.totalItems != null ? Number(asDoc.totalItems) : (Number(asDoc.quantity || 0) * Number(asDoc.packQuantity || 1));
          const after = Math.max(0, before - qty);
          asDoc.totalItems = after;
          try {
            const pq = Number(asDoc.packQuantity || 0);
            if (pq > 0) {
              asDoc.quantity = Math.max(0, Math.floor(after / pq));
            }
          } catch (_) {}
          await asDoc.save();
          handled = true;
          try {
            if (asDoc.medicine && asDoc.medicine.name) {
              await Inventory.findOneAndUpdate(
                { name: asDoc.medicine.name },
                { $inc: { stock: -qty }, $set: { price: asDoc.unitSalePrice ?? 0, supplierId: asDoc.supplier, invoiceNumber: asDoc.invoiceNumber } },
                { upsert: true, new: true }
              );
            }
          } catch {}
        }
      } catch {}
      if (!handled) {
        try { await Inventory.findByIdAndUpdate(item.medicineId, { $inc: { stock: -qty } }); } catch {}
      }
    }

    const today = new Date(); today.setHours(0,0,0,0);

    await DailySale.findOneAndUpdate(
      { date: today },
      { $inc: { totalAmount: savedSale.totalAmount, numberOfSales: 1 }, $push: { sales: savedSale._id } },
      { upsert: true, new: true }
    );

    const monthKey = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2);
    await MonthlySale.findOneAndUpdate(
      { month: monthKey },
      { $inc: { totalAmount: savedSale.totalAmount, numberOfSales: 1 }, $push: { sales: savedSale._id } },
      { upsert: true, new: true }
    );

    // Credit functionality removed: no Customer updates

    try {
      const itemsCount = (savedSale.items || []).length;
      await logAudit(req, {
        action: 'SALE_CREATE',
        entityType: 'Sale',
        entityId: savedSale._id,
        details: `Bill ${savedSale.billNo} • PKR ${savedSale.totalAmount} • ${savedSale.paymentMethod} • ${itemsCount} item(s)`
      });
    } catch (_) {}

    res.status(201).json(savedSale);
  } catch (err) { console.error('Failed to create indoor sale:', err); res.status(400).json({ message: err.message, error: err.message }); }
});

// Summary
router.get('/summary', async (_req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1); const nextMonthStart = new Date(today.getFullYear(), today.getMonth()+1, 1);
    const [cashTodayAgg] = await Sale.aggregate([{ $match: { date: { $gte: today, $lt: tomorrow }, paymentMethod: 'cash' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
    const [creditTodayAgg] = await Sale.aggregate([{ $match: { date: { $gte: today, $lt: tomorrow }, paymentMethod: 'credit' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
    const [cashMonthAgg] = await Sale.aggregate([{ $match: { date: { $gte: monthStart, $lt: nextMonthStart }, paymentMethod: 'cash' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
    const [creditMonthAgg] = await Sale.aggregate([{ $match: { date: { $gte: monthStart, $lt: nextMonthStart }, paymentMethod: 'credit' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Daily list
router.get('/daily', async (_req, res) => { try { const rows = await DailySale.find().sort({ date: -1 }); res.json(rows); } catch (e) { res.status(500).json({ error: e.message }); } });
// Monthly list
router.get('/monthly', async (_req, res) => { try { const rows = await MonthlySale.find().sort({ month: -1 }); res.json(rows); } catch (e) { res.status(500).json({ error: e.message }); } });
// Recent
router.get('/recent', async (_req, res) => {
  try {
    const sales = await Sale.find().sort({ date: -1 }).limit(5).populate('items.medicineId', 'name').lean();
    const formatted = sales.map(s => ({ id: s._id, medicine: s.items.map(it => it.medicineName || it.medicineId?.name || 'Unknown').join(', '), customer: s.customerName || s.customerId || 'Walk-in', amount: s.totalAmount, date: new Date(s.date).toLocaleDateString(), time: new Date(s.date).toLocaleTimeString() }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
