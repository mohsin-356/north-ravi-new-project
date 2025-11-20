const express = require('express');
const router = express.Router();
const Supplier = require('../Pharmacy  models/Supplier');

// GET all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create supplier
router.post('/', async (req, res) => {
  try {
    const s = new Supplier({ ...req.body });
    await s.save();
    res.status(201).json(s);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update supplier
router.put('/:id', async (req, res) => {
  try {
    const s = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!s) return res.status(404).json({ error: 'Supplier not found' });
    res.json(s);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE supplier
router.delete('/:id', async (req, res) => {
  try {
    const s = await Supplier.findByIdAndDelete(req.params.id);
    if (!s) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST add a supplier payment: { amount, method, note }
router.post('/:id/payments', async (req, res) => {
  try {
    const { amount, method, note, date } = req.body;
    const amt = Number(amount) || 0;
    if (!amt || amt <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    const s = await Supplier.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Supplier not found' });
    s.payments = s.payments || [];
    s.payments.push({ amount: amt, method, note, date: date ? new Date(date) : new Date() });
    s.totalPaid = (s.totalPaid || 0) + amt;
    // pending = purchases - paid (not below zero)
    const pending = Math.max(0, (s.totalPurchases || 0) - (s.totalPaid || 0));
    s.pendingPayments = pending;
    await s.save();
    res.json({ totalPaid: s.totalPaid, pendingPayments: s.pendingPayments, payments: s.payments });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET supplier payments history
router.get('/:id/payments', async (req, res) => {
  try {
    const s = await Supplier.findById(req.params.id).select('payments totalPaid pendingPayments');
    if (!s) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ payments: s.payments || [], totalPaid: s.totalPaid || 0, pendingPayments: s.pendingPayments || 0 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
