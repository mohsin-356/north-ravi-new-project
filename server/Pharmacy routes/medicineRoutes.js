const express = require('express');
const router = express.Router();
const Medicine = require('../Pharmacy  models/Medicine');

// POST /api/medicines - Add a new medicine
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    const medicine = new Medicine({ name: name.trim() });
    await medicine.save();
    res.status(201).json(medicine);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add medicine', details: error.message });
  }
});

// GET /api/medicines/search?q=term - Search medicines by name (case-insensitive, limited)
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    if (!q) return res.json([]);
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const results = await Medicine.find({ name: regex }).limit(limit).lean();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search medicines', details: error.message });
  }
});

// GET /api/medicines - List all medicines
router.get('/', async (req, res) => {
  try {
    const medicines = await Medicine.find();
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch medicines', details: error.message });
  }
});

module.exports = router;

// PUT /api/medicines/:id - Update medicine fields
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, barcode, genericName, manufacturer, category } = req.body || {};
    const patch = {};
    if (typeof name === 'string') patch.name = name.trim();
    if (typeof barcode === 'string') patch.barcode = barcode.trim();
    if (typeof genericName === 'string') patch.genericName = genericName.trim();
    if (typeof manufacturer === 'string') patch.manufacturer = manufacturer.trim();
    if (typeof category === 'string') patch.category = category.trim();
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'No valid fields provided' });
    const updated = await Medicine.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) return res.status(404).json({ error: 'Medicine not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update medicine', details: error.message });
  }
});
