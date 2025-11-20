const express = require('express');
const router = express.Router();

const Inventory = require('../Pharmacy  models/Inventory');
const AddStock = require('../Pharmacy  models/AddStock');
const Supplier = require('../Pharmacy  models/Supplier');
const Purchase = require('../Pharmacy  models/Purchase');

// POST /api/supplier-returns
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

      // For current schema each Purchase doc represents a single medicine.
      // Support future items array too.
      let buyPricePerUnit, medicineId;
      if (purchase.items && purchase.items.length) {
        const pItem = purchase.items.id(purchaseItemId);
        if (!pItem) continue;
        buyPricePerUnit = pItem.buyPricePerUnit || (pItem.buyPricePerPack / pItem.packQuantity);
        medicineId = pItem.medicine || pItem.medicineId;
        pItem.totalItems = Math.max(0, pItem.totalItems - quantity);
      } else {
        // single item purchase fallback
        buyPricePerUnit = purchase.buyPricePerUnit;
        medicineId = purchase.medicine;
        purchase.totalItems = Math.max(0, (purchase.totalItems || purchase.quantity * purchase.packQuantity) - quantity);
      }

      refundTotal += quantity * buyPricePerUnit;

      // Decrease inventory stock
      await Inventory.findByIdAndUpdate(medicineId, { $inc: { stock: -quantity } });
      // Decrease AddStock totalItems
      await AddStock.findOneAndUpdate({ medicine: medicineId, status: 'approved' }, { $inc: { totalItems: -quantity } }, { sort: { date: -1 } });
    }

    // Update purchase totalPurchaseAmount irrespective of schema
    purchase.totalPurchaseAmount = Math.max(0, (purchase.totalPurchaseAmount || 0) - refundTotal);

    // Save purchase changes
    await purchase.save().catch(() => {});

    // Update supplier totals and then recompute pendingPayments = max(0, totalPurchases - totalPaid)
    const sup = await Supplier.findByIdAndUpdate(
      purchase.supplier,
      {
        $inc: { totalPurchases: -refundTotal },
        $push: {
          returns: {
            amount: refundTotal,
            date: new Date(),
            purchase: purchaseId,
          },
        },
      },
      { new: true }
    ).catch(() => null);

    if (sup) {
      try {
        const pending = Math.max(0, (sup.totalPurchases || 0) - (sup.totalPaid || 0));
        if (pending !== (sup.pendingPayments || 0)) {
          sup.pendingPayments = pending;
          await sup.save();
        }
      } catch (_) {}
    }

    return res.json({ refunded: refundTotal });
  } catch (err) {
    console.error('Supplier return error:', err.message);
    res.status(500).json({ error: 'Failed to process supplier return', details: err.message });
  }
});

// GET /api/supplier-returns/history
// Optional query: from, to (ISO date or yyyy-mm-dd), q (text matches supplier name, invoice, medicineName)
router.get('/history', async (req, res) => {
  try {
    const { from, to, q } = req.query || {};
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    // Load suppliers that have returns
    const suppliers = await Supplier.find({ 'returns.0': { $exists: true } }).lean();

    // Build a flat list of returns with context
    const results = [];
    for (const s of suppliers) {
      const returns = s.returns || [];
      for (const r of returns) {
        const rDate = new Date(r.date);
        if (fromDate && rDate < fromDate) continue;
        if (toDate && rDate > toDate) continue;

        let purchaseDoc = null;
        if (r.purchase) {
          try {
            purchaseDoc = await Purchase.findById(r.purchase).lean();
          } catch (_) {}
        }

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

        // Text filter q
        if (q) {
          const qq = String(q).toLowerCase();
          const hay = [row.supplierName, row.invoiceNumber, row.medicineName].join(' ').toLowerCase();
          if (!hay.includes(qq)) continue;
        }
        results.push(row);
      }
    }

    // Sort desc by date
    results.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(results);
  } catch (err) {
    console.error('Supplier returns history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch supplier returns history' });
  }
});

module.exports = router;
