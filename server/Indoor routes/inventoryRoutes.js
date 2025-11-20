const express = require('express');
const router = express.Router();
const IndoorInventory = require('../Indoor models/Inventory');

// GET /api/indoor/inventory/search
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
    const baseStock = (inStock === '1' || inStock === 'true') ? { stock: { $gt: 0 } } : {};

    // Anchored-first
    const anchoredConds = [];
    if (parts.length > 0) {
      anchoredConds.push({ name: new RegExp('^' + escapeRegex(parts[0]), 'i') });
      for (let i = 1; i < parts.length; i++) anchoredConds.push({ name: new RegExp(escapeRegex(parts[i]), 'i') });
    }
    const anchoredFilter = anchoredConds.length > 0 ? { ...baseStock, $and: anchoredConds } : { ...baseStock };
    const anchored = await IndoorInventory.find(anchoredFilter).sort({ name: 1 }).limit(max);

    // Contains-all tokens
    const containsConds = parts.map(p => ({ name: new RegExp(escapeRegex(p), 'i') }));
    const containsFilter = containsConds.length > 0 ? { ...baseStock, $and: containsConds } : { ...baseStock };
    const contains = await IndoorInventory.find(containsFilter).sort({ name: 1 }).limit(max);

    // Merge
    const seen = new Set(); const ranked = [];
    for (const doc of anchored) { const id = String(doc._id); if (!seen.has(id)) { seen.add(id); ranked.push({ doc, score: 0 }); } }
    for (const doc of contains) { const id = String(doc._id); if (!seen.has(id)) { seen.add(id); ranked.push({ doc, score: 1 }); } }
    ranked.sort((a, b) => (a.score - b.score) || String(a.doc.name || '').localeCompare(String(b.doc.name || '')));
    res.json(ranked.slice(0, max).map(r => r.doc));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/indoor/inventory
router.get('/', async (_req, res) => {
  try { const items = await IndoorInventory.find(); res.json(items); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/indoor/inventory/outofstock
router.get('/outofstock', async (_req, res) => {
  try { const count = await IndoorInventory.countDocuments({ stock: 0 }); res.json({ count }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/indoor/inventory
router.post('/', async (req, res) => {
  try {
    const { name, stock = 0, price, batchNumber, expiryDate, supplierId, category } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name is required' });

    const existing = await IndoorInventory.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existing) {
      const update = {
        $inc: { stock: Number(stock) || 0 },
        $set: {
          ...(price != null ? { price } : {}),
          ...(batchNumber ? { batchNumber } : {}),
          ...(expiryDate ? { expiryDate } : {}),
          ...(supplierId ? { supplierId } : {}),
          ...(category ? { category } : {})
        }
      };
      const updated = await IndoorInventory.findByIdAndUpdate(existing._id, update, { new: true });
      return res.status(200).json(updated);
    }

    const saved = await new IndoorInventory({ name, stock, price, batchNumber, expiryDate, supplierId, category }).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/indoor/inventory/adjust/:id
router.patch('/adjust/:id', async (req, res) => {
  const { id } = req.params; const { change } = req.body;
  try {
    const updated = await IndoorInventory.findByIdAndUpdate(id, { $inc: { stock: change } }, { new: true });
    if (!updated) return res.status(404).send('Item not found');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/indoor/inventory/:id
router.put('/:id', async (req, res) => {
  try {
    const updatedItem = await IndoorInventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedItem) return res.status(404).send('Item not found');
    res.json(updatedItem);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/indoor/inventory/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await IndoorInventory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).send('Item not found');
    res.json({ message: 'Item deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
