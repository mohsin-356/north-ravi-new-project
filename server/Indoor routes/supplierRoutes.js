const express = require('express');
const router = express.Router();
const Supplier = require('../Indoor models/Supplier');
const Purchase = require('../Indoor models/Purchase');
const { logAudit } = require('../Indoor middleware/audit');

// POST /api/indoor/suppliers
router.post('/', async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, taxId, totalPurchases, pendingPayments, lastOrder, status, supplies = [], purchases = [] } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });
    const supplier = new Supplier({ name, contactPerson, phone, email, address, taxId, totalPurchases, pendingPayments, lastOrder, status, supplies, purchases });
    await supplier.save();
    try { await logAudit(req, { action: 'SUPPLIER_CREATE', entityType: 'Supplier', entityId: supplier._id, details: supplier.name }); } catch (_) {}
    res.status(201).json(supplier);
  } catch (error) { res.status(500).json({ error: 'Failed to add supplier', details: error.message }); }
});

// PUT /api/indoor/suppliers/:id
router.put('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    try { await logAudit(req, { action: 'SUPPLIER_UPDATE', entityType: 'Supplier', entityId: supplier._id, details: supplier.name }); } catch (_) {}
    res.json(supplier);
  } catch (err) { res.status(500).json({ error: 'Failed to update supplier', details: err.message }); }
});

// GET /api/indoor/suppliers
router.get('/', async (_req, res) => {
  try {
    const suppliers = await Supplier.find();
    const toSave = [];
    for (const s of suppliers) {
      try {
        const purchases = await Purchase.find({ supplier: s._id }).select('totalPurchaseAmount status purchaseDate');
        let totalPurch = 0; let lastOrder = s.lastOrder ? new Date(s.lastOrder) : null;
        for (const p of purchases) { if ((p.status || 'approved') === 'approved') totalPurch += Number(p.totalPurchaseAmount || 0); const pd = p.purchaseDate ? new Date(p.purchaseDate) : null; if (pd && (!lastOrder || pd > lastOrder)) lastOrder = pd; }
        const pending = Math.max(0, Number(totalPurch || 0) - Number(s.totalPaid || 0));
        let changed = false;
        if (s.totalPurchases !== totalPurch) { s.totalPurchases = totalPurch; changed = true; }
        if (lastOrder && String(s.lastOrder || '') !== String(lastOrder)) { s.lastOrder = lastOrder; changed = true; }
        if (s.pendingPayments !== pending) { s.pendingPayments = pending; changed = true; }
        if (changed) toSave.push(s.save());
      } catch (_) {}
    }
    if (toSave.length) { try { await Promise.allSettled(toSave); } catch {} }
    res.json(suppliers);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch suppliers', details: error.message }); }
});

// DELETE /api/indoor/suppliers/:id
router.delete('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    try { await logAudit(req, { action: 'SUPPLIER_DELETE', entityType: 'Supplier', entityId: req.params.id, details: supplier?.name || '' }); } catch (_) {}
    res.json({ message: 'Supplier deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete supplier', details: err.message }); }
});

// Payments
router.post('/:id/payments', async (req, res) => {
  try {
    const { amount, method, note, date } = req.body || {}; const amt = Number(amount) || 0;
    if (!amt || amt <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    const s = await Supplier.findById(req.params.id); if (!s) return res.status(404).json({ error: 'Supplier not found' });
    s.payments = s.payments || []; s.payments.push({ amount: amt, method, note, date: date ? new Date(date) : new Date() });
    s.totalPaid = (s.totalPaid || 0) + amt; const pending = Math.max(0, (s.totalPurchases || 0) - (s.totalPaid || 0)); s.pendingPayments = pending;
    await s.save();
    try { await logAudit(req, { action: 'SUPPLIER_PAYMENT', entityType: 'Supplier', entityId: s._id, details: `${s.name} • PKR ${amt} • ${method || ''}` }); } catch (_) {}
    res.json({ totalPaid: s.totalPaid, pendingPayments: s.pendingPayments, payments: s.payments });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/:id/payments', async (req, res) => {
  try {
    const s = await Supplier.findById(req.params.id).select('payments totalPaid pendingPayments');
    if (!s) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ payments: s.payments || [], totalPaid: s.totalPaid || 0, pendingPayments: s.pendingPayments || 0 });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
