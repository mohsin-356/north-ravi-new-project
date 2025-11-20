const express = require('express');
const router = express.Router();
const ExpenseDepartment = require('../models/ExpenseDepartment');

// Create expense department
router.post('/', async (req, res) => {
  try {
    const dep = await ExpenseDepartment.create(req.body);
    res.status(201).json(dep);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all expense departments
router.get('/', async (_req, res) => {
  try {
    const items = await ExpenseDepartment.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update expense department
router.put('/:id', async (req, res) => {
  try {
    const dep = await ExpenseDepartment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!dep) return res.status(404).json({ message: 'ExpenseDepartment not found' });
    res.json(dep);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete expense department
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ExpenseDepartment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'ExpenseDepartment not found' });
    res.json({ message: 'ExpenseDepartment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
