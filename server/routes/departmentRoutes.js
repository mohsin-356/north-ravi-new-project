const express = require('express');
const router = express.Router();
const Department = require('../models/Department');

// Create department
router.post('/', async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json(department);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all departments
router.get('/', async (_, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update department
router.put('/:id', async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete department
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Department.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
