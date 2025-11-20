const express = require('express');
const router = express.Router();
const Expense = require('../Indoor models/Expense');
const { logAudit } = require('../Indoor middleware/audit');

// GET /api/indoor/expenses
router.get('/', async (_req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 }).lean();
    const mapped = expenses.map(e => ({
      id: e._id,
      date: e.date ? new Date(e.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      type: e.type || 'Other',
      amount: Number(e.amount) || 0,
      notes: e.notes || e.description || ''
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/indoor/expenses
router.post('/', async (req, res) => {
  try {
    const payload = {
      type: req.body.type || 'Other',
      notes: req.body.notes || req.body.title || '',
      description: req.body.description || '',
      amount: Number(req.body.amount) || 0,
      date: req.body.date ? new Date(req.body.date) : new Date(),
    };
    const saved = await Expense.create(payload);
    try { await logAudit(req, { action: 'EXPENSE_CREATE', entityType: 'Expense', entityId: saved._id, details: `${saved.type}: ${saved.amount}` }); } catch (_) {}
    res.status(201).json({
      id: saved._id,
      date: saved.date ? new Date(saved.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      type: saved.type || 'Other',
      amount: Number(saved.amount) || 0,
      notes: saved.notes || saved.description || ''
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/indoor/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const updatePayload = {
      type: req.body.type || 'Other',
      notes: req.body.notes || req.body.title || '',
      description: req.body.description || '',
      amount: Number(req.body.amount) || 0,
      date: req.body.date ? new Date(req.body.date) : new Date(),
    };
    const updated = await Expense.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    if (!updated) return res.status(404).json({ message: 'Expense not found' });
    try { await logAudit(req, { action: 'EXPENSE_UPDATE', entityType: 'Expense', entityId: updated._id, details: `${updated.type}: ${updated.amount}` }); } catch (_) {}
    res.json({
      id: updated._id,
      date: updated.date ? new Date(updated.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      type: updated.type || 'Other',
      amount: Number(updated.amount) || 0,
      notes: updated.notes || updated.description || ''
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/indoor/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await Expense.findByIdAndDelete(id);
    try { if (existing) await logAudit(req, { action: 'EXPENSE_DELETE', entityType: 'Expense', entityId: id, details: `${existing.type}: ${existing.amount}` }); } catch (_) {}
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
