const express = require('express');
const router = express.Router();
const Purchase = require('../Pharmacy  models/Purchase');
const Supplier = require('../Pharmacy  models/Supplier');
const Medicine = require('../Pharmacy  models/Medicine');

// Recalculate supplier pendingPayments = max(0, totalPurchases - totalPaid)
async function recalcPendingForSupplier(supplierId) {
  try {
    if (!supplierId) return;
    const s = await Supplier.findById(supplierId).select('totalPurchases totalPaid pendingPayments');
    if (!s) return;
    const pending = Math.max(0, (s.totalPurchases || 0) - (s.totalPaid || 0));
    if (pending !== (s.pendingPayments || 0)) {
      s.pendingPayments = pending;
      await s.save();
    }
  } catch (e) {
    console.warn('Failed to recalc supplier pendingPayments:', e?.message || e);
  }
}

// Get last invoice by medicine (and optional supplier)
// Usage: GET /api/purchases/last-invoice?medicine=<id>&supplier=<id>
router.get('/last-invoice', async (req, res) => {
  try {
    const { medicine, supplier } = req.query;
    if (!medicine) {
      return res.status(400).json({ error: 'medicine query parameter is required' });
    }
    const filter = { medicine };
    if (supplier) filter.supplier = supplier;
    const last = await Purchase.findOne(filter)
      .sort({ purchaseDate: -1, createdAt: -1 })
      .select('invoiceNumber purchaseDate supplierName medicineName');
    if (!last) return res.json({ invoiceNumber: '', purchaseDate: null });
    res.json({
      invoiceNumber: last.invoiceNumber || '',
      purchaseDate: last.purchaseDate || null,
      supplierName: last.supplierName,
      medicineName: last.medicineName
    });
  } catch (error) {
    console.error('Error fetching last invoice:', error);
    res.status(500).json({ error: 'Failed to fetch last invoice' });
  }
});

// Create a new purchase record (defaults to pending). Supplier totals will be updated only on approval.
router.post('/', async (req, res) => {
  try {
    const {
      medicine,
      supplier,
      quantity,
      packQuantity,
      buyPricePerPack,
      salePricePerPack,
      invoiceNumber,
      expiryDate,
      minStock
    } = req.body;

    // Calculate derived values
    const totalItems = quantity * packQuantity;
    const buyPricePerUnit = buyPricePerPack / packQuantity;
    const totalPurchaseAmount = buyPricePerPack * quantity;
    const salePricePerUnit = salePricePerPack ? salePricePerPack / packQuantity : null;

    // Get medicine and supplier details
    const medicineDoc = await Medicine.findById(medicine);
    const supplierDoc = await Supplier.findById(supplier);

    if (!medicineDoc || !supplierDoc) {
      return res.status(404).json({ error: 'Medicine or Supplier not found' });
    }

    // Create purchase record
    const purchase = new Purchase({
      medicine,
      medicineName: medicineDoc.name,
      supplier,
      supplierName: supplierDoc.name,
      quantity,
      packQuantity,
      totalItems,
      buyPricePerPack,
      buyPricePerUnit,
      totalPurchaseAmount,
      salePricePerPack,
      salePricePerUnit,
      invoiceNumber,
      expiryDate,
      minStock
    });

    await purchase.save();

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: 'Failed to create purchase record' });
  }
});

// Get purchases (defaults to approved only unless status=all or specific provided)
router.get('/', async (req, res) => {
  try {
    const { supplier, medicine, startDate, endDate, status } = req.query;
    
    let filter = {};
    
    if (supplier) filter.supplier = supplier;
    if (medicine) filter.medicine = medicine;
    if (!status || status === 'approved') {
      filter.status = 'approved';
    } else if (status !== 'all') {
      filter.status = status;
    }
    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) filter.purchaseDate.$gte = new Date(startDate);
      if (endDate) filter.purchaseDate.$lte = new Date(endDate);
    }

    const purchases = await Purchase.find(filter)
      .populate('medicine', 'name genericName')
      .populate('supplier', 'name')
      .sort({ purchaseDate: -1 });

    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Get purchases by supplier
router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const { supplierId } = req.params;
    
    const purchases = await Purchase.find({ supplier: supplierId })
      .populate('medicine', 'name genericName')
      .sort({ purchaseDate: -1 });

    // Calculate total purchases for this supplier
    const totalAmount = purchases.reduce((sum, purchase) => sum + purchase.totalPurchaseAmount, 0);

    res.json({
      purchases,
      totalAmount,
      count: purchases.length
    });
  } catch (error) {
    console.error('Error fetching supplier purchases:', error);
    res.status(500).json({ error: 'Failed to fetch supplier purchases' });
  }
});

// Get purchase by ID
router.get('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('medicine', 'name genericName')
      .populate('supplier', 'name');

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.json(purchase);
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
});

// Update purchase status and adjust supplier totals when moving to/from 'approved'
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = await Purchase.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const prevStatus = existing.status;
    // If status is unchanged, just return
    if (prevStatus === status) {
      return res.json(existing);
    }

    // Apply update
    existing.status = status;
    await existing.save();

    // Adjust supplier totals based on transition to/from approved
    try {
      const amount = Number(existing.totalPurchaseAmount) || 0;
      if (amount && existing.supplier) {
        if (status === 'approved' && prevStatus !== 'approved') {
          // transitioned to approved
          await Supplier.findByIdAndUpdate(existing.supplier, {
            $inc: { totalPurchases: amount },
            $push: { purchases: { date: existing.purchaseDate || new Date(), amount, items: existing.totalItems, invoice: existing.invoiceNumber || '' } },
            lastOrder: new Date()
          });
        } else if (status !== 'approved' && prevStatus === 'approved') {
          // transitioned away from approved
          await Supplier.findByIdAndUpdate(existing.supplier, {
            $inc: { totalPurchases: -amount }
          });
        }
        await recalcPendingForSupplier(existing.supplier);
      }
    } catch (e) {
      console.error('Failed to adjust supplier totals on status change:', e.message);
    }

    res.json(existing);
  } catch (error) {
    console.error('Error updating purchase status:', error);
    res.status(500).json({ error: 'Failed to update purchase status' });
  }
});

// Delete purchase by ID (and adjust supplier totals if it was approved)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await Purchase.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // If deleting an approved purchase, decrement supplier totals
    try {
      const amount = Number(existing.totalPurchaseAmount) || 0;
      if (amount && existing.supplier && existing.status === 'approved') {
        await Supplier.findByIdAndUpdate(existing.supplier, { $inc: { totalPurchases: -amount } });
        await recalcPendingForSupplier(existing.supplier);
      }
    } catch (e) {
      console.warn('Failed adjusting supplier totals on delete:', e?.message || e);
    }

    await existing.deleteOne();
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({ error: 'Failed to delete purchase' });
  }
});

module.exports = router;
