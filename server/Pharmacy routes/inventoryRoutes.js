const express = require('express');
const router = express.Router();
const Inventory = require('../Pharmacy  models/Inventory');

// Search inventory items (fast prefix search)
router.get('/search', async (req, res) => {
  try {
    const { name, q } = req.query;
    const term = String(name || q || '').trim();
    if (!term) return res.json([]);
    const rawLimit = parseInt(String(req.query.limit || '20'), 10);
    const max = Math.max(1, Math.min(Number.isFinite(rawLimit) ? rawLimit : 20, 100));
    const inStock = String(req.query.inStock || '').toLowerCase();

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = term.split(/\s+/).filter(Boolean);
    // Build anchored-first filter (fast path)
    const anchoredConds = [];
    if (parts.length > 0) {
      anchoredConds.push({ name: new RegExp('^' + escapeRegex(parts[0]), 'i') });
      for (let i = 1; i < parts.length; i++) anchoredConds.push({ name: new RegExp(escapeRegex(parts[i]), 'i') });
    }
    const baseStock = (inStock === '1' || inStock === 'true') ? { stock: { $gt: 0 } } : {};
    const anchoredFilter = anchoredConds.length > 0 ? { ...baseStock, $and: anchoredConds } : { ...baseStock };

    const anchored = await Inventory.find(anchoredFilter).sort({ name: 1 }).limit(max);

    // Also run contains-all-tokens to include mid-string matches
    const containsConds = parts.map(p => ({ name: new RegExp(escapeRegex(p), 'i') }));
    const containsFilter = containsConds.length > 0 ? { ...baseStock, $and: containsConds } : { ...baseStock };
    const contains = await Inventory.find(containsFilter).sort({ name: 1 }).limit(max);

    // Merge, rank anchored first, dedupe by _id, and cap to max
    const seen = new Set();
    const ranked = [];
    for (const doc of anchored) { if (!seen.has(String(doc._id))) { seen.add(String(doc._id)); ranked.push({ doc, score: 0 }); } }
    for (const doc of contains) { if (!seen.has(String(doc._id))) { seen.add(String(doc._id)); ranked.push({ doc, score: 1 }); } }
    ranked.sort((a, b) => (a.score - b.score) || String(a.doc.name || '').localeCompare(String(b.doc.name || '')));
    const out = ranked.slice(0, max).map(r => r.doc);
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const items = await Inventory.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get out of stock count
router.get('/outofstock', async (req, res) => {
  try {
    const count = await Inventory.countDocuments({ stock: 0 });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new inventory item
router.post('/', async (req, res) => {
  try {
    const { name, stock = 0, price, batchNumber, expiryDate, supplierId, category } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name is required' });

    // Case-insensitive match on name to merge existing
    const existing = await Inventory.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existing) {
      const update = {
        $inc: { stock: Number(stock) || 0 },
        $set: {
          // refresh metadata if provided
          ...(price != null ? { price } : {}),
          ...(batchNumber ? { batchNumber } : {}),
          ...(expiryDate ? { expiryDate } : {}),
          ...(supplierId ? { supplierId } : {}),
          ...(category ? { category } : {})
        }
      };
      const updated = await Inventory.findByIdAndUpdate(existing._id, update, { new: true });
      return res.status(200).json(updated);
    }

    // Create new if not found
    const newItem = new Inventory({ name, stock, price, batchNumber, expiryDate, supplierId, category });
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Adjust stock
router.patch('/adjust/:id', async (req, res) => {
    const { id } = req.params;
    const { change } = req.body; // change can be positive or negative
    try {
        const updated = await Inventory.findByIdAndUpdate(id, { $inc: { stock: change } }, { new: true });
        if (!updated) {
            return res.status(404).send('Item not found');
        }
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update inventory item
router.put('/:id', async (req, res) => {
  try {
    const updatedItem = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedItem) {
      return res.status(404).send('Item not found');
    }
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    const deletedItem = await Inventory.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).send('Item not found');
    }
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
