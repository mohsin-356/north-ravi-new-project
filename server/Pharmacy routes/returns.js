const express = require('express');
const router = express.Router();

const Sale = require('../Pharmacy  models/Sale');
const Inventory = require('../Pharmacy  models/Inventory');
const DailySale = require('../Pharmacy  models/DailySale');
const MonthlySale = require('../Pharmacy  models/MonthlySale');
const AddStock = require('../Pharmacy  models/AddStock');
const Customer = require('../Pharmacy  models/Customer');

// POST /api/returns
// Expected body: { saleId: string, items: [{ saleItemId, quantity, reason }] }
router.post('/', async (req, res) => {
  try {
    const { saleId, items } = req.body;
    if (!saleId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Fetch sale with items
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    let refundTotal = 0;

    // Adjust each item in sale, inventory, and add-stock
    for (const ret of items) {
      const saleItem = sale.items.id(ret.saleItemId);
      if (!saleItem) continue;

      // Ensure not exceeding original qty
      const qtyToReturn = Math.min(ret.quantity, saleItem.quantity);
      if (qtyToReturn <= 0) continue;

      // Increment AddStock.totalItems on the exact AddStock record referenced by the sale
      // Note: in this app, saleItem.medicineId stores the AddStock _id used at POS time
      const addStockDoc = await AddStock.findById(saleItem.medicineId).populate('medicine');
      if (addStockDoc) {
        const prevUnits = (addStockDoc.totalItems != null)
          ? Number(addStockDoc.totalItems)
          : (Number(addStockDoc.quantity || 0) * Number(addStockDoc.packQuantity || 1));
        const nextUnits = prevUnits + qtyToReturn;
        addStockDoc.totalItems = nextUnits;
        await addStockDoc.save();

        // Keep Inventory aggregate in sync (by medicine name)
        try {
          if (addStockDoc.medicine && addStockDoc.medicine.name) {
            await Inventory.findOneAndUpdate(
              { name: addStockDoc.medicine.name },
              { $inc: { stock: qtyToReturn } },
              { upsert: true, new: true }
            );
          }
        } catch (e) {
          console.error('Inventory increment failed on return:', e?.message || e);
        }
      } else {
        // Fallback: if for some reason AddStock doc not found by id, do nothing (UI reads stock from AddStock)
      }

      // Update sale item quantity
      saleItem.quantity -= qtyToReturn;
      refundTotal += qtyToReturn * saleItem.price;
    }

    // Reduce sale totalAmount
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

    // If original sale was credit and linked to a customer, update their record
    if (sale.paymentMethod === 'credit' && sale.customerId) {
      try {
        // Decrease customer's totalPurchases and loyaltyPoints
        const points = Math.floor(refundTotal / 100);
        await Customer.findByIdAndUpdate(sale.customerId, {
          $inc: { totalPurchases: -refundTotal, loyaltyPoints: -points },
          $push: {
            creditHistory: {
              medicines: items.map(it => ({ medicineId: sale.items.id(it.saleItemId)?.medicineId, quantity: it.quantity, price: 0 })),
              amount: -refundTotal,
              date: new Date(),
              paid: true
            }
          }
        });
      } catch (err) {
        console.error('Failed to update customer on return', err.message);
      }
    }

    return res.json({ refunded: refundTotal, sale });
  } catch (err) {
    console.error('Return processing failed', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
