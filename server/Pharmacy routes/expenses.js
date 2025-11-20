const express = require('express');
const router = express.Router();
// Use the Pharmacy Expense model so data is stored in the pharmacy_expense collection
const Expense = require('../Pharmacy  models/Expense');

// Get all expenses (map hospital schema -> Pharmacy UI shape)
router.get('/', async (req, res) => {
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

// Add new expense (map Pharmacy UI -> hospital schema)
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
    // Return Pharmacy UI shape
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

// Update expense (map Pharmacy UI -> hospital schema)
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

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
