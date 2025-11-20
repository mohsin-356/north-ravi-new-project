const express = require('express');
const router = express.Router();

const Inventory = require('../Indoor models/Inventory');
const AddStock = require('../Indoor models/AddStock');
const Supplier = require('../Indoor models/Supplier');
const Purchase = require('../Indoor models/Purchase');
const { logAudit } = require('../Indoor middleware/audit');

async function incInventoryClamped(filter, deltaUnits, setFields = {}) {
  try {
    const current = await Inventory.findOne(filter);
    const base = current ? Number(current.stock || 0) : 0;
    const next = Math.max(0, base + Number(deltaUnits || 0));
    const update = { $set: { ...setFields, stock: next } };
    return await Inventory.findOneAndUpdate(filter, update, { upsert: true, new: true });
  } catch (_) { return null; }
}

// POST /api/indoor/supplier-returns
// Expected body: { purchaseId: string, items: [{ purchaseItemId, quantity }] }
// quantity is in UNITS (not packs)
router.post('/', async (req, res) => {
  try {
    const { purchaseId, items } = req.body;
    if (!purchaseId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Missing purchaseId or items' });
    }

    // Load purchase
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    let refundTotal = 0;

    for (const ret of items) {
      const { purchaseItemId, quantity } = ret;
      if (!quantity || quantity <= 0) continue;

      // Current schema: one medicine per Purchase; support future items array
      let buyPricePerUnit, medicineId;
      if (purchase.items && purchase.items.length) {
        const pItem = purchase.items.id(purchaseItemId);
        if (!pItem) continue;
        buyPricePerUnit = pItem.buyPricePerUnit || (pItem.buyPricePerPack / pItem.packQuantity);
        medicineId = pItem.medicine || pItem.medicineId;
        // Do not mutate purchase item counts; keep original records intact
      } else {
        buyPricePerUnit = purchase.buyPricePerUnit;
        medicineId = purchase.medicine;
        // Do not mutate purchase total items; keep purchase metrics unchanged
      }

      refundTotal += quantity * buyPricePerUnit;

      // Decrease inventory and AddStock matching this purchase (by invoice or medicine)
      try {
        let invDoc = null;
        if (purchase.invoiceNumber) {
          invDoc = await incInventoryClamped({ invoiceNumber: purchase.invoiceNumber }, -quantity);
        }
        if (!invDoc && purchase.medicineName) {
          await incInventoryClamped({ name: purchase.medicineName }, -quantity);
        }
      } catch (_) {}

      try {
        const q = { medicine: medicineId, status: 'approved' };
        if (purchase.invoiceNumber) q.invoiceNumber = purchase.invoiceNumber;
        const add = await AddStock.findOne(q).sort({ date: -1, _id: -1 });
        if (add) {
          const prev = add.totalItems != null ? Number(add.totalItems) : Number(add.quantity || 0) * Number(add.packQuantity || 1);
          const next = Math.max(0, prev - quantity);
          add.totalItems = next;
          try {
            const pq = Number(add.packQuantity || 0);
            if (pq > 0) {
              add.quantity = Math.max(0, Math.floor(next / pq));
            }
          } catch (_) {}
          await add.save();
        }
      } catch (_) {}
    }

    // Do not adjust purchase monetary totals; do not touch supplier totals
    try {
      await Supplier.findByIdAndUpdate(
        purchase.supplier,
        { $push: { returns: { amount: refundTotal, date: new Date(), purchase: purchaseId } } },
        { new: true }
      );
    } catch (_) {}

    // Do not auto-create Expense entries for returns

    try {
      await logAudit(req, {
        action: 'RETURN_SUPPLIER',
        entityType: 'Purchase',
        entityId: purchaseId,
        details: `Supplier return amount PKR ${refundTotal} for invoice ${purchase.invoiceNumber || purchaseId}`,
      });
    } catch (_) {}

    return res.json({ refunded: refundTotal });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process supplier return', details: err.message });
  }
});

// GET /api/indoor/supplier-returns/history
router.get('/history', async (req, res) => {
  try {
    const { from, to, q } = req.query || {};
    const fromDate = from ? new Date(from) : null; const toDate = to ? new Date(to) : null; if (toDate) toDate.setHours(23,59,59,999);

    const suppliers = await Supplier.find({ 'returns.0': { $exists: true } }).lean();
    const results = [];
    for (const s of suppliers) {
      for (const r of (s.returns || [])) {
        const rDate = new Date(r.date);
        if (fromDate && rDate < fromDate) continue; if (toDate && rDate > toDate) continue;
        let purchaseDoc = null; if (r.purchase) { try { purchaseDoc = await Purchase.findById(r.purchase).lean(); } catch (_) {} }
        const row = {
          date: rDate,
          amount: r.amount || 0,
          supplierId: s._id,
          supplierName: s.name,
          purchaseId: r.purchase || null,
          invoiceNumber: purchaseDoc?.invoiceNumber || '',
          medicineName: purchaseDoc?.medicineName || '',
          totalItems: purchaseDoc?.totalItems ?? null
        };
        if (q) { const qq = String(q).toLowerCase(); const hay = [row.supplierName, row.invoiceNumber, row.medicineName].join(' ').toLowerCase(); if (!hay.includes(qq)) continue; }
        results.push(row);
      }
    }
    results.sort((a,b) => new Date(b.date) - new Date(a.date));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch supplier returns history' });
  }
});

module.exports = router;
