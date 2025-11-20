const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const ExpenseDepartment = require('../models/ExpenseDepartment');

// Create expense
router.post('/', async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.expenseDepartmentId) {
      try {
        const dep = await ExpenseDepartment.findById(payload.expenseDepartmentId).lean();
        if (dep) {
          payload.expenseDepartmentId = dep._id;
          payload.expenseDepartmentName = dep.name;
        }
      } catch {}
    }
    const expense = await Expense.create(payload);
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get expenses with optional date range (from/to) or month/year, and optional expenseDepartmentId; supports optional pagination
router.get('/', async (req, res) => {
  try {
    const { month, year, from, to, expenseDepartmentId } = req.query; // month: 1-12, year: yyyy
    const page = Math.max(parseInt(req.query.page || '0', 10), 0);
    const limit = Math.max(parseInt(req.query.limit || '0', 10), 0);

    const filter = {};
    if (from && to) {
      const start = new Date(from);
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      filter.date = { $gte: start, $lt: end };
    }

    if (expenseDepartmentId) {
      filter.expenseDepartmentId = String(expenseDepartmentId);
    }

    // If page & limit are provided (>0), return paginated payload
    if (page > 0 && limit > 0) {
      const total = await Expense.countDocuments(filter);
      const items = await Expense.find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      return res.json({ data: items, total, page, pageSize: limit });
    }

    // Backward compatibility: return full array when no paging
    const expenses = await Expense.find(filter).sort({ date: -1 }).lean();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update expense
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
