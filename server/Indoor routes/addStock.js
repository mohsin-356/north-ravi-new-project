const express = require('express');
const router = express.Router();

const IndoorAddStock = require('../Indoor models/AddStock');
const IndoorMedicine = require('../Indoor models/Medicine');
const IndoorSupplier = require('../Indoor models/Supplier');
const IndoorInventory = require('../Indoor models/Inventory');
const IndoorPurchase = require('../Indoor models/Purchase');
const { logAudit } = require('../Indoor middleware/audit');

function normalizeInvoiceNumber(raw) {
  try {
    if (!raw) return '';
    let s = String(raw).trim().toUpperCase();
    s = s.replace(/\s+/g, '');
    const m = s.match(/^(.*?)-?(\d+)$/);
    if (m) {
      const prefix = (m[1] || 'INV').replace(/[^A-Z0-9]/g, '') || 'INV';
      const digits = (m[2] || '').replace(/\D/g, '');
      if (digits) return `${prefix}-${digits.padStart(6, '0')}`;
    }
    if (/^\d+$/.test(s)) return `INV-${s.padStart(6, '0')}`;
    return s.replace(/[^A-Z0-9-]/g, '');
  } catch { return String(raw || ''); }
}

// Ensure IndoorInventory stock never goes below zero when adjusting
async function incInventoryClamped(filter, deltaUnits, setFields = {}) {
  try {
    const current = await IndoorInventory.findOne(filter);
    const base = current ? Number(current.stock || 0) : 0;
    const next = Math.max(0, base + Number(deltaUnits || 0));
    const update = { $set: { ...setFields, stock: next } };
    return await IndoorInventory.findOneAndUpdate(filter, update, { upsert: true, new: true });
  } catch (e) {
    return null;
  }
}

async function recalcPendingForSupplier(supplierId) {
  try {
    if (!supplierId) return;
    const s = await IndoorSupplier.findById(supplierId);
    if (!s) return;
    const rows = await IndoorPurchase.find({ supplier: supplierId }).select('totalPurchaseAmount status purchaseDate');
    let totalPurch = 0;
    let lastOrder = s.lastOrder ? new Date(s.lastOrder) : null;
    for (const r of rows) {
      if ((r.status || 'approved') === 'approved') totalPurch += Number(r.totalPurchaseAmount || 0);
      const pd = r.purchaseDate ? new Date(r.purchaseDate) : null;
      if (pd && (!lastOrder || pd > lastOrder)) lastOrder = pd;
    }
    s.totalPurchases = totalPurch;
    if (lastOrder) s.lastOrder = lastOrder;
    const pending = Math.max(0, Number(s.totalPurchases || 0) - Number(s.totalPaid || 0));
    s.pendingPayments = pending;
    await s.save();
  } catch {}
}

// POST /api/indoor/add-stock
router.post('/', async (req, res) => {
  try {
    const { medicine, medicineName, quantity, packQuantity, buyPricePerPack, salePricePerPack, supplier, expiryDate, minStock, invoiceNumber, category, status, purchaseDate } = req.body || {};
    if ((!medicine && !medicineName) || quantity == null || packQuantity == null || buyPricePerPack == null) {
      return res.status(400).json({ error: 'medicine (or medicineName), quantity, packQuantity, buyPricePerPack are required' });
    }
    const qtyNum = Number(quantity);
    const packQtyNum = Number(packQuantity);
    const buyPerPackNum = Number(buyPricePerPack);
    if (!Number.isFinite(qtyNum) || !Number.isFinite(packQtyNum) || !Number.isFinite(buyPerPackNum) || packQtyNum <= 0 || qtyNum <= 0) {
      return res.status(400).json({ error: 'quantity and packQuantity must be positive numbers, buyPricePerPack must be a number' });
    }

    let medId = medicine;
    if (!medId && medicineName) {
      let existing = await IndoorMedicine.findOne({ name: medicineName });
      if (!existing) existing = await IndoorMedicine.create({ name: medicineName, category: category || '' });
      medId = existing._id;
    }
    const med = await IndoorMedicine.findById(medId);
    if (!med) return res.status(404).json({ error: 'Medicine not found' });

    let supId = supplier;
    let sup = null;
    if (!supId) {
      sup = await IndoorSupplier.findOne({ name: 'Unknown Supplier' });
      if (!sup) sup = await IndoorSupplier.create({ name: 'Unknown Supplier', contact: '', phone: '' });
      supId = sup._id;
    } else {
      sup = await IndoorSupplier.findById(supId);
      if (!sup) return res.status(404).json({ error: 'Supplier not found' });
    }

    const unitBuyPrice = buyPerPackNum / packQtyNum;
    const totalItems = qtyNum * packQtyNum;
    const unitSalePrice = salePricePerPack != null ? (Number(salePricePerPack) / packQtyNum) : undefined;
    const profitPerUnit = unitSalePrice != null ? (unitSalePrice - unitBuyPrice) : undefined;
    const invNo = normalizeInvoiceNumber(invoiceNumber || '');

    const row = await IndoorAddStock.create({
      medicine: med._id,
      quantity: qtyNum,
      packQuantity: packQtyNum,
      buyPricePerPack: buyPerPackNum,
      salePricePerPack,
      unitBuyPrice,
      unitSalePrice,
      profitPerUnit,
      totalItems,
      unitPrice: unitBuyPrice,
      invoiceNumber: invNo,
      supplier: supId,
      expiryDate,
      minStock,
      category,
      status: status || 'pending'
    });

    // Create purchase record for reporting
    try {
      await IndoorPurchase.create({
        addStockId: row._id,
        medicine: med._id,
        medicineName: med.name,
        supplier: supId,
        supplierName: sup?.name || '',
        quantity: qtyNum,
        packQuantity: packQtyNum,
        totalItems,
        buyPricePerPack: buyPerPackNum,
        buyPricePerUnit: unitBuyPrice,
        totalPurchaseAmount: buyPerPackNum * qtyNum,
        salePricePerPack: salePricePerPack != null ? Number(salePricePerPack) : undefined,
        salePricePerUnit: unitSalePrice,
        invoiceNumber: invNo,
        expiryDate,
        minStock,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        status: status || 'pending'
      });
      await recalcPendingForSupplier(supId);
    } catch {}

    // If approved immediately, upsert inventory (clamped)
    if ((status || 'pending') === 'approved') {
      try {
        await incInventoryClamped(
          { name: med.name },
          totalItems,
          { price: unitSalePrice ?? 0, expiryDate, supplierId: supId, invoiceNumber: invNo }
        );
      } catch {}
    }

    try { await logAudit(req, { action: 'ADD_STOCK_CREATE', entityType: 'AddStock', entityId: row._id, details: `${med.name} • ${qtyNum} packs • INV ${invNo}` }); } catch (_) {}
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add stock', details: error.message });
  }
});

// GET /api/indoor/add-stock (paged or legacy)
router.get('/', async (req, res) => {
  try {
    const rawPage = parseInt(req.query.page || '0', 10);
    const rawLimit = parseInt(req.query.limit || '0', 10);
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 0) : 0;
    const limit = Number.isFinite(rawLimit) ? Math.max(rawLimit, 0) : 0;
    const q = (req.query.q || '').toString().trim();

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // base filter: approved
    const baseFilter = { status: 'approved' };

    if (page > 0 && limit > 0) {
      // Build medicine filter via IndoorMedicine when q provided
      let medicineFilter = {};
      if (q) {
        try {
          const safe = escapeRegex(q);
          const meds = await IndoorMedicine.find({
            $or: [ { name: new RegExp(safe, 'i') }, { barcode: new RegExp(safe, 'i') } ]
          }).select('_id');
          const medIds = meds.map(m => m._id);
          // Fallback to AddStock fields if present
          medicineFilter = { $or: [ { medicine: { $in: medIds } }, { name: new RegExp(safe, 'i') }, { barcode: new RegExp(safe, 'i') } ] };
        } catch (e) {
          const safe = escapeRegex(q);
          medicineFilter = { $or: [ { name: new RegExp(safe, 'i') }, { barcode: new RegExp(safe, 'i') } ] };
        }
      }

      const finalFilter = q ? { ...baseFilter, ...medicineFilter } : baseFilter;
      const total = await IndoorAddStock.countDocuments(finalFilter);
      const items = await IndoorAddStock.find(finalFilter)
        .sort({ date: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('medicine supplier');
      return res.json({ items, total, page, limit });
    }

    // Legacy non-paginated payload
    const records = await IndoorAddStock.find(baseFilter).sort({ date: -1, _id: -1 }).populate('medicine supplier');
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock records', details: error.message });
  }
});

// GET pending
router.get('/pending', async (_req, res) => {
  try {
    const pending = await IndoorAddStock.find({ status: 'pending' }).sort({ date: -1, _id: -1 }).populate('medicine supplier');
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending records', details: error.message });
  }
});

// PATCH approve
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await IndoorAddStock.findById(id).populate('medicine supplier');
    if (!row) return res.status(404).json({ error: 'Record not found' });

    const currentUnits = row.totalItems != null ? Number(row.totalItems) : Number(row.quantity || 0) * Number(row.packQuantity || 1);
    row.status = 'approved';
    await row.save();

    // mark corresponding purchase as approved (only if exists)
    try {
      const p = await IndoorPurchase.findOne({ addStockId: row._id });
      if (p && p.status !== 'approved') {
        p.status = 'approved';
        await p.save();
      }
    } catch {}

    // increment inventory by currentUnits (clamped)
    try {
      await incInventoryClamped(
        { name: row.medicine.name },
        currentUnits,
        { price: row.unitSalePrice ?? 0, expiryDate: row.expiryDate, supplierId: row.supplier?._id || row.supplier, invoiceNumber: row.invoiceNumber }
      );
    } catch {}

    try { await recalcPendingForSupplier(row.supplier?._id || row.supplier); } catch {}

    try { await logAudit(req, { action: 'ADD_STOCK_APPROVE', entityType: 'AddStock', entityId: id, details: `${row?.medicine?.name || ''} • INV ${row?.invoiceNumber || ''}` }); } catch (_) {}
    const out = await IndoorAddStock.findById(id).populate('medicine supplier');
    res.json(out);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve', details: error.message });
  }
});

// PATCH /:id/items - adjust total items units (e.g., after sales/returns)
router.patch('/:id/items', async (req, res) => {
  try {
    const { id } = req.params; const change = Number(req.body.change || 0);
    const row = await IndoorAddStock.findById(id);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    const before = row.totalItems != null ? Number(row.totalItems) : Number(row.quantity || 0) * Number(row.packQuantity || 1);
    const after = Math.max(0, before + change);
    row.totalItems = after;
    await row.save();
    // reflect into inventory as well (best effort) if approved, clamped
    try {
      if (row.status === 'approved') {
        await incInventoryClamped(
          { invoiceNumber: row.invoiceNumber },
          change
        );
      }
    } catch {}
    try { await logAudit(req, { action: 'ADD_STOCK_UPDATE', entityType: 'AddStock', entityId: id, details: `${row?.medicine?.name || ''} • INV ${row?.invoiceNumber || ''} • ${change} units` }); } catch (_) {}
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update items', details: error.message });
  }
});

// PATCH /:id/quantity - adjust number of packs (recompute totalItems)
router.patch('/:id/quantity', async (req, res) => {
  try {
    const { id } = req.params; const change = Number(req.body.change || 0);
    const row = await IndoorAddStock.findById(id);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    const newQty = Math.max(0, Number(row.quantity || 0) + change);
    row.quantity = newQty;
    const pq = Math.max(1, Number(row.packQuantity || 1));
    const prevUnits = row.totalItems != null ? Number(row.totalItems) : Number(row.quantity || 0) * pq;
    row.totalItems = newQty * pq;
    await row.save();
    const deltaUnits = row.totalItems - prevUnits;
    try { if (row.status === 'approved' && deltaUnits) { await incInventoryClamped({ invoiceNumber: row.invoiceNumber }, deltaUnits); } } catch {}
    try { await logAudit(req, { action: 'ADD_STOCK_UPDATE', entityType: 'AddStock', entityId: id, details: `${row?.medicine?.name || ''} • INV ${row?.invoiceNumber || ''} • ${deltaUnits} units` }); } catch (_) {}
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quantity', details: error.message });
  }
});

// PATCH /api/indoor/add-stock/:id
// Edit fields of an AddStock row and keep IndoorInventory in sync if approved.
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      quantity,
      packQuantity,
      salePricePerPack,
      minStock,
      expiryDate,
      invoiceNumber,
      category,
      supplier
    } = req.body || {};

    const row = await IndoorAddStock.findById(id).populate('medicine supplier');
    if (!row) return res.status(404).json({ error: 'Record not found' });

    const prevUnits = row.totalItems != null ? Number(row.totalItems) : (Number(row.quantity || 0) * Number(row.packQuantity || 1));

    // Apply updates
    if (quantity != null && Number.isFinite(Number(quantity))) row.quantity = Number(quantity);
    if (packQuantity != null && Number.isFinite(Number(packQuantity))) row.packQuantity = Number(packQuantity);
    if (salePricePerPack != null && Number.isFinite(Number(salePricePerPack))) row.salePricePerPack = Number(salePricePerPack);
    if (minStock != null && Number.isFinite(Number(minStock))) row.minStock = Number(minStock);
    if (expiryDate != null) row.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    if (invoiceNumber != null) row.invoiceNumber = String(invoiceNumber || '');
    if (category != null) row.category = String(category || '');
    if (supplier) row.supplier = supplier;

    // Recalculate derived fields
    const pq = Math.max(1, Number(row.packQuantity || 1));
    const unitBuy = Number(row.unitBuyPrice || 0);
    if (row.salePricePerPack != null) {
      row.unitSalePrice = Number(row.salePricePerPack) / pq;
      row.profitPerUnit = row.unitSalePrice - unitBuy;
    } else {
      row.unitSalePrice = undefined;
      row.profitPerUnit = undefined;
    }
    row.totalItems = Number(row.quantity || 0) * pq;

    await row.save();

    // Best-effort: update matching purchase
    try {
      const p = await IndoorPurchase.findOne({ addStockId: row._id });
      if (p) {
        p.quantity = Number(row.quantity || 0);
        p.packQuantity = pq;
        p.totalItems = row.totalItems;
        p.salePricePerPack = row.salePricePerPack != null ? Number(row.salePricePerPack) : undefined;
        p.salePricePerUnit = row.unitSalePrice != null ? Number(row.unitSalePrice) : undefined;
        p.invoiceNumber = row.invoiceNumber || p.invoiceNumber;
        p.expiryDate = row.expiryDate || p.expiryDate;
        p.minStock = row.minStock != null ? Number(row.minStock) : p.minStock;
        if (supplier) { p.supplier = supplier; }
        await p.save();
      }
    } catch {}

    // If approved, sync IndoorInventory: adjust stock delta and update price/metadata (clamped)
    try {
      if (row.status === 'approved') {
        const deltaUnits = Number(row.totalItems) - prevUnits;
        const setFields = {
          price: row.unitSalePrice ?? 0,
          expiryDate: row.expiryDate || undefined,
          supplierId: row.supplier?._id || row.supplier,
          invoiceNumber: row.invoiceNumber || undefined,
        };
        let invDoc = null;
        if (row.invoiceNumber) invDoc = await incInventoryClamped({ invoiceNumber: row.invoiceNumber }, deltaUnits, setFields);
        if (!invDoc) {
          await incInventoryClamped({ name: row.medicine?.name }, deltaUnits, setFields);
        }
      }
    } catch {}

    // Recalculate supplier pending after edits
    try { await recalcPendingForSupplier(row.supplier?._id || row.supplier); } catch {}

    try { await logAudit(req, { action: 'ADD_STOCK_UPDATE', entityType: 'AddStock', entityId: id, details: `${row?.medicine?.name || ''} • INV ${row?.invoiceNumber || ''}` }); } catch (_) {}
    const out = await IndoorAddStock.findById(id).populate('medicine supplier');
    res.json(out);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update record', details: error.message });
  }
});

// DELETE /api/indoor/add-stock/:id - Delete a stock record
// Adjust IndoorInventory by removing the units contributed if this record was approved
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await IndoorAddStock.findById(id).populate('medicine supplier');
    if (!doc) return res.status(404).json({ error: 'Stock record not found' });

    let inventoryAdjusted = false;
    let unitsRemoved = 0;
    try {
      if (doc.status === 'approved' && doc.medicine && doc.medicine.name) {
        unitsRemoved = doc.totalItems != null
          ? Number(doc.totalItems)
          : (Number(doc.quantity || 0) * Number(doc.packQuantity || 1));
        if (Number.isFinite(unitsRemoved) && unitsRemoved > 0) {
          await incInventoryClamped({ name: doc.medicine.name }, -unitsRemoved);
          inventoryAdjusted = true;
        }
      }
    } catch (err) {
      // Continue with deletion even if inventory update fails
      console.warn('Indoor inventory adjust on delete failed:', err?.message || err);
    }

    await IndoorAddStock.findByIdAndDelete(id);

    try { await recalcPendingForSupplier(doc.supplier?._id || doc.supplier); } catch {}

    try { await logAudit(req, { action: 'ADD_STOCK_DELETE', entityType: 'AddStock', entityId: id, details: `${doc?.medicine?.name || ''} • INV ${doc?.invoiceNumber || ''}` }); } catch (_) {}
    res.json({ message: 'Stock record deleted', inventoryAdjusted, unitsRemoved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock record', details: error.message });
  }
});

module.exports = router;
