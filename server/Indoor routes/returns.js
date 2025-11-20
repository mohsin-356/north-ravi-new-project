const express = require('express');
const router = express.Router();

const Sale = require('../Indoor models/Sale');
const Inventory = require('../Indoor models/Inventory');
const DailySale = require('../Indoor models/DailySale');
const MonthlySale = require('../Indoor models/MonthlySale');
const AddStock = require('../Indoor models/AddStock');
const AuditLog = require('../Indoor models/AuditLog');
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

// POST /api/indoor/returns
// Expected body: { saleId: string, items: [{ saleItemId, quantity, reason }] }
router.post('/', async (req, res) => {
  try {
    const { saleId, items } = req.body;
    if (!saleId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    let refundTotal = 0;

    for (const ret of items) {
      const saleItem = sale.items.id(ret.saleItemId);
      if (!saleItem) continue;
      const qtyToReturn = Math.min(ret.quantity, saleItem.quantity);
      if (qtyToReturn <= 0) continue;

      // In this app, saleItem.medicineId stores the AddStock _id used at POS time
      const addStockDoc = await AddStock.findById(saleItem.medicineId).populate('medicine');
      if (addStockDoc) {
        const prevUnits = (addStockDoc.totalItems != null)
          ? Number(addStockDoc.totalItems)
          : (Number(addStockDoc.quantity || 0) * Number(addStockDoc.packQuantity || 1));
        const nextUnits = prevUnits + qtyToReturn;
        addStockDoc.totalItems = nextUnits;
        try {
          const pq = Number(addStockDoc.packQuantity || 0);
          if (pq > 0) {
            addStockDoc.quantity = Math.max(0, Math.floor(nextUnits / pq));
          }
        } catch (_) {}
        await addStockDoc.save();

        // Keep Inventory aggregate in sync (by medicine name)
        try {
          let invDoc = null;
          if (addStockDoc.invoiceNumber) {
            invDoc = await incInventoryClamped({ invoiceNumber: addStockDoc.invoiceNumber }, qtyToReturn);
          }
          if (!invDoc && addStockDoc.medicine && addStockDoc.medicine.name) {
            await incInventoryClamped({ name: addStockDoc.medicine.name }, qtyToReturn);
          }
        } catch (e) {}
      }

      saleItem.quantity -= qtyToReturn;
      refundTotal += qtyToReturn * saleItem.price;
    }

    sale.totalAmount = Math.max(0, sale.totalAmount - refundTotal);
    await sale.save();

    // Update daily & monthly aggregates
    const saleDate = new Date(sale.date);
    const dayStart = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
    await DailySale.findOneAndUpdate(
      { date: dayStart },
      { $inc: { totalAmount: -refundTotal } },
    );

    const monthKey = saleDate.getFullYear() + '-' + ('0' + (saleDate.getMonth() + 1)).slice(-2);
    await MonthlySale.findOneAndUpdate(
      { month: monthKey },
      { $inc: { totalAmount: -refundTotal } },
    );

    // Credit/customer adjustments removed

    try {
      await logAudit(req, {
        action: 'RETURN_CUSTOMER',
        entityType: 'Sale',
        entityId: saleId,
        details: `Refunded PKR ${refundTotal} for bill ${sale.billNo || saleId}`,
      });
    } catch (_) {}

    return res.json({ refunded: refundTotal, sale });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/indoor/returns/history
// Returns list of customer refunds using AuditLog entries (action: 'RETURN_CUSTOMER')
router.get('/history', async (req, res) => {
  try {
    const { from, to, q } = req.query || {};
    const fromD = from ? new Date(from) : null; const toD = to ? new Date(to) : null; if (toD) toD.setHours(23,59,59,999);
    const logs = await AuditLog.find({ action: 'RETURN_CUSTOMER' }).sort({ timestamp: -1 }).lean();
    const rows = [];
    for (const lg of logs) {
      const d = lg.timestamp ? new Date(lg.timestamp) : new Date();
      if (fromD && d < fromD) continue; if (toD && d > toD) continue;
      const det = String(lg.details || '');
      // Parse amount and bill from details: 'Refunded PKR <amt> for bill <billNo>'
      let amt = 0; let bill = '';
      try {
        const am = det.match(/PKR\s*([0-9]+(?:\.[0-9]+)?)/i); if (am) amt = Number(am[1] || 0);
        const bm = det.match(/bill\s+([A-Za-z0-9-]+)/i); if (bm) bill = bm[1];
      } catch {}
      let saleDoc = null;
      try { saleDoc = lg.entityId ? await Sale.findById(lg.entityId).lean() : (bill ? await Sale.findOne({ billNo: bill }).lean() : null); } catch {}
      const row = {
        date: d,
        amount: Number(amt || 0),
        type: 'customer',
        billNo: saleDoc?.billNo || bill || '',
        customerName: saleDoc?.customerName || 'Walk-in',
        saleId: saleDoc?._id || null,
      };
      if (q) { const qq = String(q).toLowerCase(); const hay = [row.billNo || '', row.customerName || '', det || ''].join(' ').toLowerCase(); if (!hay.includes(qq)) continue; }
      rows.push(row);
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch customer return history' }); }
});

module.exports = router;
