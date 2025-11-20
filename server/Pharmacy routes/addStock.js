const express = require('express');
const router = express.Router();
const AddStock = require('../Pharmacy  models/AddStock');
const Medicine = require('../Pharmacy  models/Medicine');
const Supplier = require('../Pharmacy  models/Supplier');
const Inventory = require('../Pharmacy  models/Inventory');
const Purchase = require('../Pharmacy  models/Purchase');

// Normalize invoice numbers to a canonical form, e.g. "1" -> "INV-000001"
function normalizeInvoiceNumber(raw) {
  try {
    if (!raw) return '';
    let s = String(raw).trim().toUpperCase();
    s = s.replace(/\s+/g, '');
    // PREFIX-<digits> or PREFIX<digits>
    const m = s.match(/^(.*?)-?(\d+)$/);
    if (m) {
      const prefix = (m[1] || 'INV').replace(/[^A-Z0-9]/g, '') || 'INV';
      const digits = (m[2] || '').replace(/\D/g, '');
      if (digits) return `${prefix}-${digits.padStart(6, '0')}`;
    }
    // Only digits
    if (/^\d+$/.test(s)) return `INV-${s.padStart(6, '0')}`;
    // Fallback keep A-Z0-9- only
    return s.replace(/[^A-Z0-9-]/g, '');
  } catch { return String(raw || ''); }
}

// Recalculate supplier aggregates from Purchase collection
async function recalcPendingForSupplier(supplierId) {
  try {
    if (!supplierId) return;
    const s = await Supplier.findById(supplierId);
    if (!s) return;

    // Sum approved purchases for totalPurchases and get latest purchaseDate
    const rows = await Purchase.find({ supplier: supplierId }).select('totalPurchaseAmount status purchaseDate');
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
  } catch (e) {
    console.warn('recalcPendingForSupplier failed:', e?.message || e);
  }
}

// POST /api/add-stock - Add stock record
router.post('/', async (req, res) => {
  try {
    console.log('AddStock POST req.body:', req.body);
    const { medicine, medicineName, quantity, packQuantity, buyPricePerPack, salePricePerPack, supplier, expiryDate, minStock, invoiceNumber, category, status, purchaseDate } = req.body;
    if ((!medicine && !medicineName) || quantity == null || packQuantity == null || buyPricePerPack == null) {
      return res.status(400).json({ error: 'medicine (or medicineName), quantity, packQuantity, buyPricePerPack are required' });
    }
    const qtyNum = Number(quantity);
    const packQtyNum = Number(packQuantity);
    const buyPerPackNum = Number(buyPricePerPack);
    const salePerPackNum = salePricePerPack != null && salePricePerPack !== '' ? Number(salePricePerPack) : undefined;
    if (!Number.isFinite(qtyNum) || !Number.isFinite(packQtyNum) || !Number.isFinite(buyPerPackNum) || packQtyNum <= 0 || qtyNum <= 0) {
      return res.status(400).json({ error: 'quantity and packQuantity must be positive numbers, buyPricePerPack must be a number' });
    }
    // Calculate derived unit prices & profit
    const unitBuyPrice = buyPerPackNum / packQtyNum;
    const totalItems = qtyNum * packQtyNum;
    const unitSalePrice = (salePerPackNum != null) ? (salePerPackNum / packQtyNum) : undefined;
    const profitPerUnit = (unitSalePrice !== undefined) ? (unitSalePrice - unitBuyPrice) : undefined;
    // Resolve medicine: accept id or name (create if missing)
    let medId = medicine;
    if (!medId && medicineName) {
      let existing = await Medicine.findOne({ name: medicineName });
      if (!existing) {
        existing = await Medicine.create({ name: medicineName, category: category || '' });
      }
      medId = existing._id;
    }
    const med = await Medicine.findById(medId);
    if (!med) return res.status(404).json({ error: 'Medicine not found' });
    // Resolve supplier: allow missing by using/creating 'Unknown Supplier'
    let supplierId = supplier;
    let sup = null;
    if (!supplierId) {
      sup = await Supplier.findOne({ name: 'Unknown Supplier' });
      if (!sup) {
        sup = await Supplier.create({ name: 'Unknown Supplier', contact: '', phone: '' });
      }
      supplierId = sup._id;
    } else {
      sup = await Supplier.findById(supplierId);
      if (!sup) return res.status(404).json({ error: 'Supplier not found' });
    }

    const invNoRaw = invoiceNumber || '';
    const invNo = normalizeInvoiceNumber(invNoRaw);

    // Upsert behavior changes:
    // - If invoiceNumber is provided, update existing record for medicine+invoiceNumber regardless of status.
    // - If no invoiceNumber, keep a single pending record per medicine and update it.
    if (invNo) {
      const existingDoc = await AddStock.findOne({ medicine: med._id, invoiceNumber: { $in: [invNo, invNoRaw] } });
      if (existingDoc) {
        // If existing is APPROVED but incoming is not explicitly 'approved', create/update a separate PENDING record
        if (existingDoc.status === 'approved' && status !== 'approved') {
          const pendingMatch = await AddStock.findOne({ medicine: med._id, invoiceNumber: { $in: [invNo, invNoRaw] }, status: 'pending' });
          if (pendingMatch) {
            pendingMatch.quantity = qtyNum;
            pendingMatch.packQuantity = packQtyNum;
            pendingMatch.buyPricePerPack = buyPerPackNum;
            pendingMatch.salePricePerPack = salePerPackNum;
            pendingMatch.unitBuyPrice = unitBuyPrice;
            pendingMatch.unitSalePrice = unitSalePrice;
            pendingMatch.profitPerUnit = profitPerUnit;
            pendingMatch.totalItems = totalItems;
            pendingMatch.unitPrice = unitBuyPrice;
            pendingMatch.invoiceNumber = invNo;
            if (supplierId) pendingMatch.supplier = supplierId;
            if (expiryDate) pendingMatch.expiryDate = expiryDate;
            if (minStock !== undefined) pendingMatch.minStock = minStock;
            if (category !== undefined) pendingMatch.category = category;
            await pendingMatch.save();
            try {
              const qtyPacks = Number(pendingMatch.quantity || 0);
              const pq = Number(pendingMatch.packQuantity || 0);
              const bpp = Number(pendingMatch.buyPricePerPack || 0);
              const totalIt = Number(pendingMatch.totalItems != null ? pendingMatch.totalItems : (qtyPacks * (pq || 1)));
              const bpu = (pq > 0 && bpp) ? (bpp / pq) : 0;
              const spp = pendingMatch.salePricePerPack != null ? Number(pendingMatch.salePricePerPack) : undefined;
              const spu = spp != null && pq > 0 ? (spp / pq) : (pendingMatch.unitSalePrice != null ? Number(pendingMatch.unitSalePrice) : undefined);
              await Purchase.findOneAndUpdate(
                { addStockId: pendingMatch._id },
                {
                  addStockId: pendingMatch._id,
                  medicine: med._id,
                  medicineName: med.name,
                  supplier: supplierId,
                  supplierName: sup?.name || 'Unknown Supplier',
                  quantity: qtyPacks,
                  packQuantity: pq || 1,
                  totalItems: totalIt || 0,
                  buyPricePerPack: bpp,
                  buyPricePerUnit: bpu,
                  totalPurchaseAmount: bpp * qtyPacks,
                  salePricePerPack: spp,
                  salePricePerUnit: spu,
                  invoiceNumber: pendingMatch.invoiceNumber,
                  expiryDate: pendingMatch.expiryDate,
                  minStock: pendingMatch.minStock ?? 0,
                  purchaseDate: pendingMatch.date || pendingMatch.createdAt || new Date(),
                  status: pendingMatch.status || 'pending'
                },
                { upsert: true, new: true }
              );
              await recalcPendingForSupplier(supplierId);
            } catch (e) { console.warn('Purchase upsert failed on POST pendingMatch:', e?.message || e); }
            return res.status(200).json(pendingMatch);
          } else {
            const pendingNew = await AddStock.create({
              medicine: med._id,
              quantity: qtyNum,
              packQuantity: packQtyNum,
              buyPricePerPack: buyPerPackNum,
              salePricePerPack: salePerPackNum,
              unitBuyPrice,
              unitSalePrice,
              profitPerUnit,
              totalItems,
              unitPrice: unitBuyPrice,
              invoiceNumber: invNo,
              supplier: supplierId || undefined,
              expiryDate: expiryDate || undefined,
              minStock: minStock || undefined,
              category: category || undefined,
              status: 'pending'
            });
            try {
              const qtyPacks = Number(packs || qtyNum);
              const pqN = Number(packQtyNum || 0);
              const bppN = Number(buyPerPackNum || 0);
              const totalIt = Number(((packs || qtyNum) * (pqN || 1)));
              const bpuN = (pqN > 0 && bppN) ? (bppN / pqN) : 0;
              const sppN = salePerPackNum != null ? Number(salePerPackNum) : undefined;
              const spuN = sppN != null && pqN > 0 ? (sppN / pqN) : (unitSalePrice != null ? Number(unitSalePrice) : undefined);
              await Purchase.findOneAndUpdate(
                { addStockId: pendingNew._id },
                {
                  addStockId: pendingNew._id,
                  medicine: med._id,
                  medicineName: med.name,
                  supplier: supplierId,
                  supplierName: sup?.name || 'Unknown Supplier',
                  quantity: Number(pendingNew.quantity || 0),
                  packQuantity: Number(pendingNew.packQuantity || 1),
                  totalItems: Number(pendingNew.totalItems || totalIt || 0),
                  buyPricePerPack: bppN,
                  buyPricePerUnit: bpuN,
                  totalPurchaseAmount: bppN * Number(pendingNew.quantity || 0),
                  salePricePerPack: sppN,
                  salePricePerUnit: spuN,
                  invoiceNumber: pendingNew.invoiceNumber,
                  expiryDate: pendingNew.expiryDate,
                  minStock: pendingNew.minStock ?? 0,
                  purchaseDate: pendingNew.date || pendingNew.createdAt || new Date(),
                  status: pendingNew.status || 'pending'
                },
                { upsert: true, new: true }
              );
              await recalcPendingForSupplier(supplierId);
            } catch (e) { console.warn('Purchase upsert failed on POST pendingNew:', e?.message || e); }
            return res.status(200).json(pendingNew);
          }
        }
        const prevTotal = existingDoc.totalItems != null
          ? Number(existingDoc.totalItems)
          : Number(existingDoc.quantity || 0) * Number(existingDoc.packQuantity || 1);

        existingDoc.quantity = qtyNum; // packs
        existingDoc.packQuantity = packQtyNum;
        existingDoc.buyPricePerPack = buyPerPackNum;
        existingDoc.salePricePerPack = salePerPackNum;
        existingDoc.unitBuyPrice = unitBuyPrice;
        existingDoc.unitSalePrice = unitSalePrice;
        existingDoc.profitPerUnit = profitPerUnit;
        existingDoc.totalItems = totalItems;
        existingDoc.unitPrice = unitBuyPrice; // legacy
        existingDoc.invoiceNumber = invNo;
        if (supplierId) existingDoc.supplier = supplierId;
        if (expiryDate) existingDoc.expiryDate = expiryDate;
        if (minStock !== undefined) existingDoc.minStock = minStock;
        if (category !== undefined) existingDoc.category = category;
        // Do not demote an approved record back to pending
        if (status) {
          if (!(existingDoc.status === 'approved' && status !== 'approved')) {
            existingDoc.status = status;
          }
        }
        await existingDoc.save();

        // If approved, adjust Inventory by the delta
        try {
          if (existingDoc.status === 'approved' && med.name) {
            const deltaUnits = totalItems - prevTotal;
            await Inventory.findOneAndUpdate(
              { name: med.name },
              {
                ...(Number.isFinite(deltaUnits) && deltaUnits !== 0 ? { $inc: { stock: deltaUnits } } : {}),
                $set: {
                  price: existingDoc.unitSalePrice ?? 0,
                  expiryDate: existingDoc.expiryDate,
                  supplierId,
                  invoiceNumber: invNo
                }
              },
              { upsert: true, new: true }
            );
          }
        } catch (err) {
          console.error('Inventory adjustment failed on upsert POST:', err?.message || err);
        }

        // Upsert purchase record for this invoice + medicine (approved or pending)
        try {
          const qtyPacks = Number(existingDoc.quantity || 0);
          const pq = Number(existingDoc.packQuantity || 0);
          const bpp = Number(existingDoc.buyPricePerPack || 0);
          const totalIt = Number(existingDoc.totalItems != null ? existingDoc.totalItems : (qtyPacks * (pq || 1)));
          const bpu = (pq > 0 && bpp) ? (bpp / pq) : 0;
          const spp = existingDoc.salePricePerPack != null ? Number(existingDoc.salePricePerPack) : undefined;
          const spu = spp != null && pq > 0 ? (spp / pq) : (existingDoc.unitSalePrice != null ? Number(existingDoc.unitSalePrice) : undefined);
          await Purchase.findOneAndUpdate(
            { addStockId: existingDoc._id },
            {
              addStockId: existingDoc._id,
              medicine: med._id,
              medicineName: med.name,
              supplier: supplierId,
              supplierName: sup?.name || 'Unknown Supplier',
              quantity: qtyPacks,
              packQuantity: pq || 1,
              totalItems: totalIt || 0,
              buyPricePerPack: bpp,
              buyPricePerUnit: bpu,
              totalPurchaseAmount: bpp * qtyPacks,
              salePricePerPack: spp,
              salePricePerUnit: spu,
              invoiceNumber: existingDoc.invoiceNumber,
              expiryDate: existingDoc.expiryDate,
              minStock: existingDoc.minStock ?? 0,
              purchaseDate: existingDoc.date || existingDoc.createdAt || new Date(),
              status: existingDoc.status || 'approved'
            },
            { upsert: true, new: true }
          );
          await recalcPendingForSupplier(supplierId);
        } catch (e) { console.warn('Purchase upsert failed on POST upsert existing:', e?.message || e); }

        return res.status(200).json(existingDoc);
      }
    } else {
      // No invoice number: try to reuse a single pending record per medicine
      const existingPending = await AddStock.findOne({ medicine: med._id, status: 'pending' }).sort({ date: -1, _id: -1 });
      if (existingPending) {
        const prevTotal = existingPending.totalItems != null
          ? Number(existingPending.totalItems)
          : Number(existingPending.quantity || 0) * Number(existingPending.packQuantity || 1);

        existingPending.quantity = qtyNum;
        existingPending.packQuantity = packQtyNum;
        existingPending.buyPricePerPack = buyPerPackNum;
        existingPending.salePricePerPack = salePerPackNum;
        existingPending.unitBuyPrice = unitBuyPrice;
        existingPending.unitSalePrice = unitSalePrice;
        existingPending.profitPerUnit = profitPerUnit;
        existingPending.totalItems = totalItems;
        existingPending.unitPrice = unitBuyPrice;
        if (supplierId) existingPending.supplier = supplierId;
        if (expiryDate) existingPending.expiryDate = expiryDate;
        if (minStock !== undefined) existingPending.minStock = minStock;
        if (category !== undefined) existingPending.category = category;
        await existingPending.save();
        try {
          const qtyPacks = Number(existingPending.quantity || 0);
          const pq = Number(existingPending.packQuantity || 0);
          const bpp = Number(existingPending.buyPricePerPack || 0);
          const totalIt = Number(existingPending.totalItems != null ? existingPending.totalItems : (qtyPacks * (pq || 1)));
          const bpu = (pq > 0 && bpp) ? (bpp / pq) : 0;
          const spp = existingPending.salePricePerPack != null ? Number(existingPending.salePricePerPack) : undefined;
          const spu = spp != null && pq > 0 ? (spp / pq) : (existingPending.unitSalePrice != null ? Number(existingPending.unitSalePrice) : undefined);
          await Purchase.findOneAndUpdate(
            { addStockId: existingPending._id },
            {
              addStockId: existingPending._id,
              medicine: med._id,
              medicineName: med.name,
              supplier: supplierId,
              supplierName: sup?.name || 'Unknown Supplier',
              quantity: qtyPacks,
              packQuantity: pq || 1,
              totalItems: totalIt || 0,
              buyPricePerPack: bpp,
              buyPricePerUnit: bpu,
              totalPurchaseAmount: bpp * qtyPacks,
              salePricePerPack: spp,
              salePricePerUnit: spu,
              invoiceNumber: existingPending.invoiceNumber,
              expiryDate: existingPending.expiryDate,
              minStock: existingPending.minStock ?? 0,
              purchaseDate: existingPending.date || existingPending.createdAt || new Date(),
              status: existingPending.status || 'pending'
            },
            { upsert: true, new: true }
          );
          await recalcPendingForSupplier(supplierId);
        } catch (e) { console.warn('Purchase upsert failed on POST existingPending:', e?.message || e); }
        return res.status(200).json(existingPending);
      }
    }

    // No existing doc -> create a new one (original behavior)
    const totalPrice = buyPerPackNum * qtyNum;
    const addStock = new AddStock({
      medicine: med._id,
      quantity: qtyNum, // number of packs
      packQuantity: packQtyNum,
      buyPricePerPack: buyPerPackNum,
      salePricePerPack: salePerPackNum,
      unitBuyPrice,
      unitSalePrice,
      profitPerUnit,
      totalItems,
      unitPrice: unitBuyPrice, // legacy field
      invoiceNumber: invNo,
      supplier: supplierId,
      expiryDate,
      minStock,
      category,
      totalPrice,
      status: status || 'pending'
    });
    await addStock.save();

    // Create/Upsert corresponding Purchase record
    try {
      const qtyPacks = Number(addStock.quantity || 0);
      const pq = Number(addStock.packQuantity || 0);
      const bpp = Number(addStock.buyPricePerPack || 0);
      const totalIt = Number(addStock.totalItems != null ? addStock.totalItems : (qtyPacks * (pq || 1)));
      const bpu = (pq > 0 && bpp) ? (bpp / pq) : 0;
      const spp = addStock.salePricePerPack != null ? Number(addStock.salePricePerPack) : undefined;
      const spu = spp != null && pq > 0 ? (spp / pq) : (addStock.unitSalePrice != null ? Number(addStock.unitSalePrice) : undefined);
      await Purchase.findOneAndUpdate(
        { addStockId: addStock._id },
        {
          addStockId: addStock._id,
          medicine: med._id,
          medicineName: med.name,
          supplier: supplierId,
          supplierName: sup?.name || 'Unknown Supplier',
          quantity: qtyPacks,
          packQuantity: pq || 1,
          totalItems: totalIt || 0,
          buyPricePerPack: bpp,
          buyPricePerUnit: bpu,
          totalPurchaseAmount: bpp * qtyPacks,
          salePricePerPack: spp,
          salePricePerUnit: spu,
          invoiceNumber: addStock.invoiceNumber,
          expiryDate: addStock.expiryDate,
          minStock: addStock.minStock ?? 0,
          purchaseDate: addStock.date || addStock.createdAt || new Date(),
          status: addStock.status || 'pending'
        },
        { upsert: true, new: true }
      );
      await recalcPendingForSupplier(supplierId);
    } catch (e) { console.warn('Purchase upsert failed on POST create:', e?.message || e); }
    console.log('Saved AddStock doc:', addStock);

    // Update supplier order history and aggregates ONLY if already approved
    if ((status || 'pending') === 'approved') {
      try {
        await Supplier.findByIdAndUpdate(supplierId, {
          $inc: {
            totalPurchases: totalPrice
          },
          $push: {
            purchases: {
              date: purchaseDate ? new Date(purchaseDate) : new Date(),
              amount: totalPrice,
              items: totalItems,
              invoice: invoiceNumber || ''
            }
          },
          lastOrder: new Date()
        });
        await recalcPendingForSupplier(supplierId);
      } catch (err) {
        console.error('Failed to update supplier order history:', err.message);
      }
    }

    // Also create a Purchase record for reporting consistency
    try {
      const purchase = new Purchase({
        addStockId: addStock._id,
        medicine: med._id,
        medicineName: med.name,
        supplier: supplierId,
        supplierName: sup?.name || '',
        quantity: qtyNum,
        packQuantity: packQtyNum,
        totalItems,
        buyPricePerPack: buyPerPackNum,
        buyPricePerUnit: unitBuyPrice,
        totalPurchaseAmount: totalPrice,
        salePricePerPack: salePerPackNum,
        salePricePerUnit: unitSalePrice,
        invoiceNumber,
        expiryDate,
        minStock,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        status: status || 'pending'
      });
      await purchase.save();
    } catch (err) {
      console.error('Failed to create Purchase from AddStock:', err.message);
    }

    res.status(201).json(addStock);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add stock', details: error.message });
  }
});

// POST /api/add-stock/loose - Add loose units to an existing medicine and update inventory + purchases
router.post('/loose', async (req, res) => {
  try {
    const { medicine, medicineName, units, invoiceNumber } = req.body || {};
    const unitCount = Number(units);
    if ((!medicine && !medicineName) || !Number.isFinite(unitCount) || unitCount <= 0) {
      return res.status(400).json({ error: 'medicine (or medicineName) and positive units are required' });
    }

    // Resolve medicine
    let medId = medicine;
    if (!medId && medicineName) {
      const existingMed = await Medicine.findOne({ name: medicineName });
      if (!existingMed) return res.status(404).json({ error: 'Medicine not found' });
      medId = existingMed._id;
    }
    const med = await Medicine.findById(medId);
    if (!med) return res.status(404).json({ error: 'Medicine not found' });

    // Find target approved AddStock row to increment
    const invRaw = invoiceNumber || '';
    const invNorm = invRaw ? normalizeInvoiceNumber(invRaw) : '';
    let target = null;
    if (invNorm) {
      target = await AddStock.findOne({ medicine: med._id, status: 'approved', invoiceNumber: { $in: [invNorm, invRaw] } }).populate('medicine supplier');
    }
    if (!target) {
      target = await AddStock.findOne({ medicine: med._id, status: 'approved' }).sort({ date: -1, _id: -1 }).populate('medicine supplier');
    }
    if (!target) {
      return res.status(400).json({ error: 'No approved stock batch found to add loose units' });
    }

    // Increment only totalItems (do not change packs, packQuantity, or prices)
    const currentUnits = target.totalItems != null
      ? Number(target.totalItems)
      : Number(target.quantity || 0) * Number(target.packQuantity || 1);
    const newUnits = currentUnits + unitCount;
    target.totalItems = newUnits;
    await target.save();

    // Update Inventory by delta units, keep existing price metadata
    try {
      await Inventory.findOneAndUpdate(
        { name: target.medicine.name },
        {
          $inc: { stock: unitCount },
          $set: {
            price: target.unitSalePrice ?? 0,
            expiryDate: target.expiryDate,
            supplierId: target.supplier?._id || target.supplier,
            invoiceNumber: target.invoiceNumber
          }
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn('Inventory update failed on loose add:', e?.message || e);
    }

    // Create a distinct Purchase record to log this loose addition (do not overwrite previous)
    try {
      const pq = Number(target.packQuantity || 1);
      const bpu = target.unitBuyPrice != null ? Number(target.unitBuyPrice) : (pq > 0 && target.buyPricePerPack != null ? Number(target.buyPricePerPack) / pq : 0);
      const amount = bpu * unitCount;
      const purchase = new Purchase({
        addStockId: target._id,
        medicine: target.medicine._id || target.medicine,
        medicineName: target.medicine.name,
        supplier: target.supplier?._id || target.supplier,
        supplierName: target.supplier?.name || '',
        quantity: 0,
        packQuantity: pq,
        totalItems: unitCount,
        buyPricePerPack: target.buyPricePerPack,
        buyPricePerUnit: bpu,
        totalPurchaseAmount: amount,
        salePricePerPack: target.salePricePerPack,
        salePricePerUnit: target.unitSalePrice,
        invoiceNumber: target.invoiceNumber,
        expiryDate: target.expiryDate,
        minStock: target.minStock,
        purchaseDate: new Date(),
        status: 'approved'
      });
      await purchase.save();
      await recalcPendingForSupplier(target.supplier?._id || target.supplier);
    } catch (e) {
      console.warn('Purchase create failed (loose approved):', e?.message || e);
    }

    const out = await AddStock.findById(target._id).populate('medicine supplier');
    return res.json(out);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add loose items', details: error.message });
  }
});

// GET /api/add-stock - List APPROVED stock additions (default inventory)
// Supports pagination via ?page=1&limit=20 and optional search via ?q=panadol
router.get('/', async (req, res) => {
  try {
    const rawPage = parseInt(req.query.page || '0', 10);
    const rawLimit = parseInt(req.query.limit || '0', 10);
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 0) : 0;
    const limit = Number.isFinite(rawLimit) ? Math.max(rawLimit, 0) : 0;
    const q = (req.query.q || '').toString().trim();

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // base filter: approved
    const filter = { status: 'approved' };
    if (q) {
      // match medicine name or barcode; fallback to AddStock.name/barcode if present
      const safe = escapeRegex(q);
      const nameRegex = new RegExp(safe, 'i');
      filter.$or = [
        { 'medicine.name': nameRegex },
        { 'medicine.barcode': nameRegex },
        { name: nameRegex },
        { barcode: nameRegex },
      ];
    }

    if (page > 0 && limit > 0) {
      // For $or on populated fields, we need aggregation to match populated paths; simpler approach:
      // first query IDs of medicines that match, then filter by medicine in $in along with AddStock fallback fields
      let medicineFilter = {};
      if (q) {
        try {
          const safe = escapeRegex(q);
          const meds = await Medicine.find({
            $or: [ { name: new RegExp(safe, 'i') }, { barcode: new RegExp(safe, 'i') } ]
          }).select('_id');
          const medIds = meds.map(m => m._id);
          medicineFilter = { $or: [ { medicine: { $in: medIds } }, { name: new RegExp(safe, 'i') }, { barcode: new RegExp(safe, 'i') } ] };
        } catch (e) {
          // On any regex/db failure, fall back to no results on medId and only try AddStock fields
          const safe = escapeRegex(q);
          medicineFilter = { $or: [ { name: new RegExp(safe, 'i') }, { barcode: new RegExp(safe, 'i') } ] };
        }
      }

      const finalFilter = q ? { status: 'approved', ...medicineFilter } : { status: 'approved' };
      const total = await AddStock.countDocuments(finalFilter);
      const items = await AddStock.find(finalFilter)
        .sort({ date: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('medicine supplier');
      return res.json({ items, total, page, limit });
    }

    // Legacy non-paginated payload
    const records = await AddStock.find({ status: 'approved' }).sort({ date: -1, _id: -1 }).populate('medicine supplier');
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock records', details: error.message });
  }
});

// GET /api/add-stock/pending - List PENDING stock additions for review
router.get('/pending', async (_req, res) => {
  try {
    const pending = await AddStock.find({ status: 'pending' }).sort({ date: -1, _id: -1 }).populate('medicine supplier');
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending records', details: error.message });
  }
});

// PATCH /api/add-stock/:id/approve - mark pending record as approved
// Approve a pending add-stock record and update Inventory stock by totalItems
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const pending = await AddStock.findById(id).populate('medicine supplier');
    if (!pending) return res.status(404).json({ error: 'Record not found' });

    // Calculate units to add
    const pendingTotalItems = pending.totalItems != null
      ? Number(pending.totalItems)
      : Number(pending.quantity || 0) * Number(pending.packQuantity || 1);

    // Try merge: find existing approved record for same medicine + invoice
    let mergedDoc = null;
    try {
      if (pending.medicine && pending.invoiceNumber) {
        const invRaw = pending.invoiceNumber;
        const invNorm = normalizeInvoiceNumber(invRaw);
        const approvedExisting = await AddStock.findOne({
          medicine: pending.medicine._id || pending.medicine,
          invoiceNumber: { $in: [invNorm, invRaw] },
          status: 'approved'
        }).populate('medicine supplier');

        if (approvedExisting) {
          // Merge units and recompute quantity from packQuantity
          const currentApprovedUnits = approvedExisting.totalItems != null
            ? Number(approvedExisting.totalItems)
            : Number(approvedExisting.quantity || 0) * Number(approvedExisting.packQuantity || 1);
          const newApprovedUnits = currentApprovedUnits + pendingTotalItems;

          approvedExisting.totalItems = newApprovedUnits;
          // Prefer most recent pricing/expiry/supplier if provided on pending
          if (Number.isFinite(pending.packQuantity)) approvedExisting.packQuantity = pending.packQuantity;
          if (Number.isFinite(pending.buyPricePerPack)) approvedExisting.buyPricePerPack = pending.buyPricePerPack;
          if (pending.salePricePerPack != null) approvedExisting.salePricePerPack = pending.salePricePerPack;
          if (pending.unitBuyPrice != null) approvedExisting.unitBuyPrice = pending.unitBuyPrice;
          if (pending.unitSalePrice != null) approvedExisting.unitSalePrice = pending.unitSalePrice;
          if (pending.profitPerUnit != null) approvedExisting.profitPerUnit = pending.profitPerUnit;
          if (pending.expiryDate) approvedExisting.expiryDate = pending.expiryDate;
          if (pending.minStock != null) approvedExisting.minStock = pending.minStock;
          if (pending.category != null) approvedExisting.category = pending.category;
          if (pending.supplier) approvedExisting.supplier = pending.supplier._id || pending.supplier;
          approvedExisting.unitPrice = approvedExisting.unitBuyPrice; // legacy
          approvedExisting.invoiceNumber = invNorm;

          const pq = Number(approvedExisting.packQuantity || 0);
          approvedExisting.quantity = pq > 0 ? Math.floor(newApprovedUnits / pq) : newApprovedUnits;
          await approvedExisting.save();

          // Increment Inventory by pending units only
          try {
            await Inventory.findOneAndUpdate(
              { name: approvedExisting.medicine.name },
              {
                $inc: { stock: pendingTotalItems },
                $set: {
                  price: approvedExisting.unitSalePrice ?? 0,
                  expiryDate: approvedExisting.expiryDate,
                  supplierId: approvedExisting.supplier?._id || approvedExisting.supplier,
                  invoiceNumber: invNorm
                },
                $setOnInsert: {
                  category: approvedExisting.category || approvedExisting.medicine.category || ''
                }
              },
              { upsert: true, new: true }
            );
          } catch (err) {
            console.error('Inventory update failed on merge approve:', err?.message || err);
          }

          // Mark purchases linked to pending as approved and roll into supplier totals
          try {
            const related = await Purchase.find({ addStockId: id });
            const toApproveIds = related.filter(r => r.status !== 'approved').map(r => r._id);
            const approveAmount = related.filter(r => r.status !== 'approved').reduce((s, r) => s + (Number(r.totalPurchaseAmount) || 0), 0);
            if (toApproveIds.length > 0) {
              await Purchase.updateMany({ _id: { $in: toApproveIds } }, { status: 'approved', purchaseDate: pending.date || new Date() });
              if (approvedExisting.supplier) {
                await Supplier.findByIdAndUpdate(approvedExisting.supplier._id || approvedExisting.supplier, {
                  $inc: { totalPurchases: approveAmount },
                  $push: {
                    purchases: {
                      date: pending.date || new Date(),
                      amount: approveAmount,
                      items: pendingTotalItems,
                      invoice: invNorm || ''
                    }
                  },
                  lastOrder: new Date()
                });
                await recalcPendingForSupplier(approvedExisting.supplier._id || approvedExisting.supplier);
              }
            }
          } catch (err) {
            console.error('Failed to approve purchases on merge:', err?.message || err);
          }

          // Remove the pending record after merge
          await AddStock.findByIdAndDelete(id);
          mergedDoc = await AddStock.findById(approvedExisting._id).populate('medicine supplier');
          return res.json(mergedDoc);
        }
      }
    } catch (err) {
      // If merge fails, fall back to approve in place below
    }

    // Fallback: approve in place (no existing approved record to merge)
    pending.status = 'approved';
    if (pending.invoiceNumber) pending.invoiceNumber = normalizeInvoiceNumber(pending.invoiceNumber);
    await pending.save();

    try {
      const { medicine, unitSalePrice, expiryDate, supplier, category, invoiceNumber } = pending;
      if (medicine) {
        await Inventory.findOneAndUpdate(
          { name: medicine.name },
          {
            $inc: { stock: pendingTotalItems },
            $set: {
              price: pending.unitSalePrice ?? unitSalePrice ?? 0,
              expiryDate,
              supplierId: supplier ? (supplier._id || supplier) : undefined,
              invoiceNumber: pending.invoiceNumber || invoiceNumber
            },
            $setOnInsert: { category: category || medicine.category || '' }
          },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      console.error('Failed to update Inventory stock on approval:', err.message);
    }

    try {
      const related = await Purchase.find({ addStockId: id });
      if (related && related.length > 0) {
        const toApproveIds = related.filter(r => r.status !== 'approved').map(r => r._id);
        const totalApproveAmount = related
          .filter(r => r.status !== 'approved')
          .reduce((s, r) => s + (Number(r.totalPurchaseAmount) || 0), 0);
        if (toApproveIds.length > 0) {
          await Purchase.updateMany({ _id: { $in: toApproveIds } }, { status: 'approved', purchaseDate: pending.date || new Date() });
          if (pending.supplier) {
            await Supplier.findByIdAndUpdate(pending.supplier._id || pending.supplier, {
              $inc: { totalPurchases: totalApproveAmount },
              $push: {
                purchases: {
                  date: pending.date || new Date(),
                  amount: totalApproveAmount,
                  items: pendingTotalItems,
                  invoice: pending.invoiceNumber || ''
                }
              },
              lastOrder: new Date()
            });
            await recalcPendingForSupplier(pending.supplier._id || pending.supplier);
          }
        }
      }
    } catch (err) {
      console.error('Failed to approve related purchases or update supplier:', err.message);
    }

    const resultDoc = await AddStock.findById(id).populate('medicine supplier');
    res.json(resultDoc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve record', details: error.message });
  }
});

// PATCH /api/add-stock/:id/reject - mark pending record as rejected and related purchases as rejected
router.patch('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const pending = await AddStock.findById(id).populate('medicine supplier');
    if (!pending) return res.status(404).json({ error: 'Record not found' });
    if (pending.status === 'approved') {
      return res.status(400).json({ error: 'Cannot reject an already approved record' });
    }
    pending.status = 'rejected';
    await pending.save();
    try {
      await Purchase.updateMany({ addStockId: id }, { status: 'rejected' });
    } catch (err) {
      console.error('Failed to reject related purchases:', err.message);
    }
    const resultDoc = await AddStock.findById(id).populate('medicine supplier');
    res.json(resultDoc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject record', details: error.message });
  }
});

// PATCH /api/add-stock/:id/items - Adjust totalItems (units) without changing packs
router.patch('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { change } = req.body;
    if (typeof change !== 'number') {
      return res.status(400).json({ error: 'change must be a number' });
    }
    const record = await AddStock.findById(id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const newTotal = (record.totalItems || (record.quantity * record.packQuantity)) + change;
    if (newTotal < 0) {
      return res.status(400).json({ error: 'Resulting totalItems cannot be negative' });
    }

    record.totalItems = newTotal;
    await record.save();

    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to adjust items', details: error.message });
  }
});

// PUT /api/add-stock/:id - Update a stock record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const existing = await AddStock.findById(id).populate('medicine');
    if (!existing) return res.status(404).json({ error: 'Stock record not found' });

    // Compute previous units for delta
    const prevTotal = existing.totalItems != null
      ? Number(existing.totalItems)
      : Number(existing.quantity || 0) * Number(existing.packQuantity || 1);

    // Resolve incoming values with fallbacks to existing
    const quantity = body.quantity != null ? Number(body.quantity) : Number(existing.quantity || 0);
    const packQuantity = body.packQuantity != null ? Number(body.packQuantity) : Number(existing.packQuantity || 1);
    const buyPricePerPack = body.buyPricePerPack != null ? Number(body.buyPricePerPack) : Number(existing.buyPricePerPack || 0);
    const salePricePerPack = body.salePricePerPack != null ? Number(body.salePricePerPack) : (existing.salePricePerPack != null ? Number(existing.salePricePerPack) : undefined);

    const totalItems = body.totalItems != null ? Number(body.totalItems) : (quantity * packQuantity);
    const unitBuyPrice = (packQuantity > 0 && Number.isFinite(buyPricePerPack)) ? (buyPricePerPack / packQuantity) : (existing.unitBuyPrice || undefined);
    const unitSalePrice = (packQuantity > 0 && salePricePerPack != null && Number.isFinite(salePricePerPack))
      ? (salePricePerPack / packQuantity)
      : (body.unitSalePrice != null ? Number(body.unitSalePrice) : existing.unitSalePrice);
    const profitPerUnit = (unitSalePrice != null && unitBuyPrice != null) ? (unitSalePrice - unitBuyPrice) : existing.profitPerUnit;

    const update = {
      ...body,
      quantity,
      packQuantity,
      buyPricePerPack,
      salePricePerPack,
      totalItems,
      unitBuyPrice,
      unitSalePrice,
      profitPerUnit,
      unitPrice: unitBuyPrice // legacy
    };

    const updated = await AddStock.findByIdAndUpdate(id, update, { new: true }).populate('medicine supplier');

    // Propagate latest selling price to other approved records of the same medicine
    try {
      if (updated && updated.medicine) {
        const medId = updated.medicine._id || updated.medicine;
        await AddStock.updateMany(
          { medicine: medId, status: 'approved', _id: { $ne: updated._id } },
          { $set: { unitSalePrice: updated.unitSalePrice, salePricePerPack: updated.salePricePerPack } }
        );
      }
    } catch (err) {
      console.warn('Failed to propagate price to sibling stock records:', err?.message || err);
    }

    // Adjust Inventory by delta if approved
    try {
      if (updated && updated.status === 'approved' && updated.medicine?.name) {
        const deltaUnits = totalItems - prevTotal;
        if (Number.isFinite(deltaUnits) && deltaUnits !== 0) {
          await Inventory.findOneAndUpdate(
            { name: updated.medicine.name },
            {
              $inc: { stock: deltaUnits },
              $set: {
                price: updated.unitSalePrice ?? 0,
                expiryDate: updated.expiryDate,
                supplierId: updated.supplier?._id || updated.supplier,
                invoiceNumber: updated.invoiceNumber
              }
            },
            { upsert: true, new: true }
          );
        }
        // Always refresh the price metadata even if no stock delta
        await Inventory.findOneAndUpdate(
          { name: updated.medicine.name },
          {
            $set: {
              price: updated.unitSalePrice ?? 0,
              expiryDate: updated.expiryDate,
              supplierId: updated.supplier?._id || updated.supplier,
              invoiceNumber: updated.invoiceNumber
            }
          },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      console.error('Inventory adjustment failed on PUT:', err?.message || err);
    }

    // Upsert corresponding Purchase record for this AddStock
    try {
      if (updated) {
        const medId = updated.medicine?._id || updated.medicine;
        const supId = updated.supplier?._id || updated.supplier;
        const qtyPacks = Number(updated.quantity || 0);
        const pq = Number(updated.packQuantity || 0);
        const buyPerPack = Number(updated.buyPricePerPack || 0);
        const totalIt = Number(updated.totalItems != null ? updated.totalItems : (qtyPacks * (pq || 1)));
        const buyPerUnit = (pq > 0 && buyPerPack) ? (buyPerPack / pq) : 0;
        const salePerPack = updated.salePricePerPack != null ? Number(updated.salePricePerPack) : undefined;
        const salePerUnit = salePerPack != null && pq > 0 ? (salePerPack / pq) : (updated.unitSalePrice != null ? Number(updated.unitSalePrice) : undefined);

        await Purchase.findOneAndUpdate(
          { addStockId: updated._id },
          {
            addStockId: updated._id,
            medicine: medId,
            medicineName: updated.medicine?.name || updated.name || '',
            supplier: supId,
            supplierName: updated.supplier?.name || 'Unknown Supplier',
            quantity: qtyPacks,
            packQuantity: pq || 1,
            totalItems: totalIt || 0,
            buyPricePerPack: buyPerPack,
            buyPricePerUnit: buyPerUnit,
            totalPurchaseAmount: buyPerPack * qtyPacks,
            salePricePerPack: salePerPack,
            salePricePerUnit: salePerUnit,
            invoiceNumber: updated.invoiceNumber,
            expiryDate: updated.expiryDate,
            minStock: updated.minStock ?? 0,
            purchaseDate: updated.date || updated.createdAt || new Date(),
            status: updated.status || 'approved'
          },
          { upsert: true, new: true }
        );
        await recalcPendingForSupplier(supId);
      }
    } catch (err) {
      console.error('Failed to upsert Purchase on edit:', err?.message || err);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock record', details: error.message });
  }
});

// DELETE /api/add-stock/:id - Delete a stock record
// Business rule: Do NOT alter Purchase history; only adjust Inventory if this record was approved.
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Load full record to compute impact and find medicine name
    const doc = await AddStock.findById(id).populate('medicine');
    if (!doc) return res.status(404).json({ error: 'Stock record not found' });

    let inventoryAdjusted = false;
    let unitsRemoved = 0;
    try {
      if (doc.status === 'approved' && doc.medicine && doc.medicine.name) {
        // Compute units contributed by this record
        unitsRemoved = doc.totalItems != null
          ? Number(doc.totalItems)
          : (Number(doc.quantity || 0) * Number(doc.packQuantity || 1));
        if (Number.isFinite(unitsRemoved) && unitsRemoved > 0) {
          await Inventory.findOneAndUpdate(
            { name: doc.medicine.name },
            { $inc: { stock: -unitsRemoved } },
            { new: true }
          );
          inventoryAdjusted = true;
        }
      }
    } catch (err) {
      // Log but continue with delete; UI can reconcile later
      console.error('Failed to adjust Inventory on delete:', err?.message || err);
    }

    await AddStock.findByIdAndDelete(id);

    res.json({
      message: 'Stock record deleted',
      inventoryAdjusted,
      unitsRemoved
      // Purchase history intentionally untouched
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock record', details: error.message });
  }
});

// BULK IMPORT CSV/Excel converted JSON
router.post('/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }

    const inserted = [];

    let skipped = 0;
  for (const row of items) {
      // Support various header casings from CSV (e.g. exported file)
      const medicineName = row.medicine || row.Medicine || row['Medicine Name'] || row['medicine name'] || row.name || row.Name;
      const quantityVal = row.quantity || row.Quantity || row.stock || row.Stock;
      const unitPriceVal = row.unitPrice || row.UnitPrice || row['Unit Price'];
      let supplierName = row.supplier || row.Supplier || row['Supplier Name'];
      if (!supplierName || supplierName.trim() === '') {
        supplierName = 'Unknown Supplier';
      }
      const expiryDate = row.expiryDate || row.ExpiryDate || row['Expiry Date'] || row.expiry;
      const minStock = row.minStock || row.MinStock || row['Min Stock'] || row.min;

      // Ensure required
      if (!medicineName || !quantityVal || !unitPriceVal || !supplierName) {
        skipped++;
        continue; // skip invalid rows
      }

      // Find or create medicine
      let med = await Medicine.findOne({ name: medicineName.trim() });
      if (!med) {
        med = new Medicine({ name: medicineName.trim() });
        await med.save();
      }

      // Find or create supplier
      let sup = await Supplier.findOne({ name: supplierName.trim() });
      if (!sup) {
        sup = new Supplier({ name: supplierName.trim() });
        await sup.save();
      }

      const addStock = new AddStock({
        medicine: med._id,
        quantity: parseInt(quantityVal, 10) || 0,
        unitPrice: parseFloat(unitPriceVal) || 0,
        supplier: sup._id,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        minStock: minStock ? parseInt(minStock, 10) : undefined,
      });
      await addStock.save();
      inserted.push(addStock);
    }

    res.json({ inserted: inserted.length, skipped });
  } catch (error) {
    res.status(500).json({ error: 'Bulk import failed', details: error.message });
  }
});

// EXPORT to CSV
router.get('/export', async (_req, res) => {
  try {
    const records = await AddStock.find().populate('medicine supplier');

    let csv = 'Medicine,Quantity,UnitPrice,Supplier,ExpiryDate,MinStock\n';
    records.forEach(r => {
      csv += `${r.medicine.name},${r.quantity},${r.unitPrice},${r.supplier.name},${r.expiryDate ? new Date(r.expiryDate).toISOString().split('T')[0] : ''},${r.minStock || ''}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="addstock_export.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Export failed', details: error.message });
  }
});

// POST /api/add-stock/consolidate - Admin utility to merge approved duplicates per medicine
// Idempotent: combines multiple approved AddStock records for the same medicine into one by summing totalItems.
// Does NOT modify Inventory as approvals would have already adjusted stock.
router.post('/consolidate', async (_req, res) => {
  try {
    const approved = await AddStock.find({ status: 'approved' }).populate('medicine');
    // Group by medicine id
    const byMed = new Map();
    for (const rec of approved) {
      const key = String(rec.medicine?._id || rec.medicine);
      if (!byMed.has(key)) byMed.set(key, []);
      byMed.get(key).push(rec);
    }

    const result = [];
    for (const [medId, list] of byMed.entries()) {
      if (list.length <= 1) continue; // nothing to consolidate
      // Choose the first as the survivor (could pick the most recent)
      const survivor = list[0];
      const duplicates = list.slice(1);
      const sumApprovedTotals = list.reduce((sum, doc) => {
        const t = doc.totalItems != null
          ? Number(doc.totalItems)
          : Number(doc.quantity || 0) * Number(doc.packQuantity || 1);
        return sum + (isNaN(t) ? 0 : t);
      }, 0);
      // Update survivor
      survivor.totalItems = sumApprovedTotals;
      const pq = Number(survivor.packQuantity || 0);
      survivor.quantity = pq > 0 ? Math.floor(sumApprovedTotals / pq) : sumApprovedTotals;
      survivor.status = 'approved';
      await survivor.save();
      // Delete duplicates
      await AddStock.deleteMany({ _id: { $in: duplicates.map(d => d._id) } });
      result.push({ medicine: medId, kept: survivor._id, removed: duplicates.map(d => d._id), totalItems: survivor.totalItems });
    }

    res.json({ consolidated: result.length, details: result });
  } catch (error) {
    res.status(500).json({ error: 'Consolidation failed', details: error.message });
  }
});

module.exports = router;
