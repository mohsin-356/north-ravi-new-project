const express = require('express');
const router = express.Router();
const Purchase = require('../Indoor models/Purchase');
const Supplier = require('../Indoor models/Supplier');
const Medicine = require('../Indoor models/Medicine');

async function recalcPendingForSupplier(supplierId) {
  try {
    if (!supplierId) return;
    const s = await Supplier.findById(supplierId).select('totalPurchases totalPaid pendingPayments');
    if (!s) return;
    const pending = Math.max(0, (s.totalPurchases || 0) - (s.totalPaid || 0));
    if (pending !== (s.pendingPayments || 0)) { s.pendingPayments = pending; await s.save(); }
  } catch (e) { console.warn('[indoor] recalc pending failed:', e?.message || e); }
}

// GET /api/indoor/purchases/last-invoice?medicine=&supplier=
router.get('/last-invoice', async (req, res) => {
  try {
    const { medicine, supplier } = req.query;
    if (!medicine) return res.status(400).json({ error: 'medicine query parameter is required' });
    const filter = { medicine }; if (supplier) filter.supplier = supplier;
    const last = await Purchase.findOne(filter).sort({ purchaseDate: -1, createdAt: -1 }).select('invoiceNumber purchaseDate supplierName medicineName');
    if (!last) return res.json({ invoiceNumber: '', purchaseDate: null });
    res.json({ invoiceNumber: last.invoiceNumber || '', purchaseDate: last.purchaseDate || null, supplierName: last.supplierName, medicineName: last.medicineName });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch last invoice' }); }
});

// POST /api/indoor/purchases
router.post('/', async (req, res) => {
  try {
    const { medicine, supplier, quantity, packQuantity, buyPricePerPack, salePricePerPack, invoiceNumber, expiryDate, minStock } = req.body || {};
    const totalItems = Number(quantity) * Number(packQuantity);
    const buyPricePerUnit = Number(buyPricePerPack) / Number(packQuantity);
    const totalPurchaseAmount = Number(buyPricePerPack) * Number(quantity);
    const salePricePerUnit = salePricePerPack ? Number(salePricePerPack) / Number(packQuantity) : null;
    const med = await Medicine.findById(medicine); const sup = await Supplier.findById(supplier);
    if (!med || !sup) return res.status(404).json({ error: 'Medicine or Supplier not found' });
    const purchase = new Purchase({ medicine, medicineName: med.name, supplier, supplierName: sup.name, quantity, packQuantity, totalItems, buyPricePerPack, buyPricePerUnit, totalPurchaseAmount, salePricePerPack, salePricePerUnit, invoiceNumber, expiryDate, minStock });
    await purchase.save();
    res.status(201).json(purchase);
  } catch (error) { res.status(500).json({ error: 'Failed to create purchase record' }); }
});

// GET /api/indoor/purchases
router.get('/', async (req, res) => {
  try {
    const { supplier, medicine, startDate, endDate, status } = req.query || {};
    const filter = {};
    if (supplier) filter.supplier = supplier;
    if (medicine) filter.medicine = medicine;
    if (!status || status === 'approved') filter.status = 'approved'; else if (status !== 'all') filter.status = status;
    if (startDate || endDate) { filter.purchaseDate = {}; if (startDate) filter.purchaseDate.$gte = new Date(startDate); if (endDate) filter.purchaseDate.$lte = new Date(endDate); }
    const purchases = await Purchase.find(filter).populate('medicine', 'name genericName').populate('supplier', 'name').sort({ purchaseDate: -1 });
    res.json(purchases);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch purchases' }); }
});

// GET /api/indoor/purchases/supplier/:supplierId
router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const purchases = await Purchase.find({ supplier: req.params.supplierId }).populate('medicine', 'name genericName').sort({ purchaseDate: -1 });
    const totalAmount = purchases.reduce((sum, p) => sum + (p.totalPurchaseAmount || 0), 0);
    res.json({ purchases, totalAmount, count: purchases.length });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch supplier purchases' }); }
});

// GET /api/indoor/purchases/:id
router.get('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate('medicine', 'name genericName').populate('supplier', 'name');
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    res.json(purchase);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch purchase' }); }
});

// PATCH /api/indoor/purchases/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {}; const existing = await Purchase.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Purchase not found' });
    if (!['pending','approved','rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const prevStatus = existing.status; existing.status = status; await existing.save();
    try {
      const amount = Number(existing.totalPurchaseAmount) || 0;
      if (amount && existing.supplier) {
        if (status === 'approved' && prevStatus !== 'approved') {
          await Supplier.findByIdAndUpdate(existing.supplier, { $inc: { totalPurchases: amount }, $push: { purchases: { date: existing.purchaseDate || new Date(), amount, items: existing.totalItems, invoice: existing.invoiceNumber || '' } }, lastOrder: new Date() });
        } else if (status !== 'approved' && prevStatus === 'approved') {
          await Supplier.findByIdAndUpdate(existing.supplier, { $inc: { totalPurchases: -amount } });
        }
        await recalcPendingForSupplier(existing.supplier);
      }
    } catch (e) { console.error('[indoor] supplier totals adjust failed:', e?.message || e); }
    res.json(existing);
  } catch (error) { res.status(500).json({ error: 'Failed to update purchase status' }); }
});

// DELETE /api/indoor/purchases/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await Purchase.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Purchase not found' });
    try {
      const amount = Number(existing.totalPurchaseAmount) || 0;
      if (amount && existing.supplier && existing.status === 'approved') {
        await Supplier.findByIdAndUpdate(existing.supplier, { $inc: { totalPurchases: -amount } });
        await recalcPendingForSupplier(existing.supplier);
      }
    } catch {}
    await existing.deleteOne();
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete purchase' }); }
});

module.exports = router;
