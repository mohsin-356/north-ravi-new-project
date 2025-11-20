const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Sale = require('../Pharmacy  models/Sale');
const Customer = require('../Pharmacy  models/Customer');

/**
 * GET /api/credit/customers
 * Returns list of customers who have at least one credit sale. Optional query params:
 *   - search: text search on customer name
 *   - company: exact match on customer company name
 */
router.get('/customers', async (req, res) => {
  try {
    const { search = '', company = '' } = req.query;

    // Build aggregation pipeline
    const pipeline = [
      {
        $match: {
          paymentMethod: 'credit',
          customerId: { $ne: null }
        }
      },

      {
        $group: {
          _id: { $toString: '$customerId' },
          totalCreditSale: { $sum: '$totalAmount' },
          lastSaleDate: { $max: '$date' },
          salesCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'pharmacy_customer',
          let: { cid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: [ { $toString: '$_id' }, '$$cid' ] } } }
          ],
          as: 'customer'
        }
      },
      { $unwind: '$customer' }
    ];

    if (company) {
      pipeline.push({ $match: { 'customer.companyName': company } });
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      pipeline.push({ $match: { 'customer.name': regex } });
    }

    // Sort largest credit first
    pipeline.push({ $sort: { totalCreditSale: -1 } });

    const results = await Sale.aggregate(pipeline);

    const formatted = results.map(r => ({
      customerId: r._id.toString(),
      name: r.customer.name,
      company: r.customer.companyName || '',
      totalCreditSale: r.totalCreditSale,
      salesCount: r.salesCount,
      lastSaleDate: r.lastSaleDate
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Failed to fetch credited customers', err);
    res.status(500).json({ message: 'Failed to fetch credited customers' });
  }
});

/**
 * GET /api/credit/customer/:id/sales
 * Returns list of all credit sales for a customer ID
 */
router.get('/customer/:id/sales', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    // Support historical records where customerId may be stored as String or ObjectId
    const idObj = new mongoose.Types.ObjectId(id);
    const sales = await Sale.find({
      customerId: { $in: [id, idObj] },
      paymentMethod: 'credit'
    })
      .sort({ date: -1 });

    res.json(sales);
  } catch (err) {
    console.error('Failed to fetch credit sales for customer', err);
    res.status(500).json({ message: 'Failed to fetch credit sales for customer' });
  }
});

/**
 * POST /api/credit/customer/:id/payments
 * Records a payment against a customer's credit. Payload: { amount: number, date?: string|Date, method?: string, reference?: string }
 */
router.post('/customer/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    const { amount, date, method, reference, notes } = req.body || {};
    const amt = Number(amount);
    if (!amt || !isFinite(amt) || amt <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Record a consolidated payment entry
    customer.creditHistory = customer.creditHistory || [];
    customer.creditHistory.push({
      medicines: [],
      amount: amt,
      date: date ? new Date(date) : new Date(),
      paid: true,
    });

    if (notes) {
      const existing = customer.notes ? customer.notes + '\n' : '';
      customer.notes = existing + `[Payment ${new Date().toISOString()}] ${notes}`;
    }

    // Reduce customer's totalPurchases to reflect cleared credit (floor at 0)
    if (typeof customer.totalPurchases === 'number') {
      const newTotal = Math.max(0, (customer.totalPurchases || 0) - amt);
      customer.totalPurchases = newTotal;
    }

    await customer.save();

    res.status(201).json({ ok: true, customerId: customer._id.toString(), payment: { amount: amt, date: date || new Date() } });
  } catch (err) {
    console.error('Failed to record customer payment', err);
    res.status(500).json({ message: 'Failed to record payment', error: err?.message || String(err) });
  }
});

/**
 * POST /api/credit/customer/:id/settle
 * Body: {
 *   allocations: [{ saleId: string, amount: number }],
 *   notes?: string
 * }
 */
router.post('/customer/:id/settle', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    const { allocations = [], notes = '' } = req.body || {};
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ message: 'Provide allocations to settle' });
    }

    const totalPay = allocations.reduce((sum, a) => sum + Number(a?.amount || 0), 0);
    if (!totalPay || !isFinite(totalPay) || totalPay <= 0) {
      return res.status(400).json({ message: 'Invalid total amount' });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Convert saleIds to ObjectIds safely
    const saleIds = allocations
      .map(a => a.saleId)
      .filter(Boolean)
      .filter(v => mongoose.Types.ObjectId.isValid(String(v)))
      .map(v => new mongoose.Types.ObjectId(String(v)));
    if (saleIds.length === 0) {
      return res.status(400).json({ message: 'No valid saleIds provided' });
    }
    const idObj = new mongoose.Types.ObjectId(id);
    const sales = await Sale.find({
      _id: { $in: saleIds },
      customerId: { $in: [id, idObj] },
      paymentMethod: 'credit'
    });
    const salesById = new Map(sales.map(s => [s._id.toString(), s]));

    // Debug info for tracing potential mismatches
    if (sales.length === 0) {
      console.warn('[settle] No matching sales found for customer', { customerId: id, saleIds: saleIds.map(s => s.toString()) });
    }

    for (const a of allocations) {
      const s = salesById.get(String(a.saleId));
      const inc = Number(a.amount || 0);
      if (!s || !inc || !isFinite(inc) || inc <= 0) continue;
      const remaining = Math.max(0, (s.totalAmount || 0) - (s.paidAmount || 0));
      const apply = Math.min(remaining, inc);
      if (apply > 0) {
        s.paidAmount = (s.paidAmount || 0) + apply;
        await s.save();
      }
    }

    customer.creditHistory = customer.creditHistory || [];
    customer.creditHistory.push({ medicines: [], amount: totalPay, date: new Date(), paid: true });

    if (notes) {
      const existing = customer.notes ? customer.notes + '\n' : '';
      customer.notes = existing + `[Payment ${new Date().toISOString()}] ${notes}`;
    }

    if (typeof customer.totalPurchases === 'number') {
      customer.totalPurchases = Math.max(0, (customer.totalPurchases || 0) - totalPay);
    }

    await customer.save();
    res.status(200).json({ ok: true, totalPaid: totalPay });
  } catch (err) {
    console.error('Failed to settle payments', err);
    res.status(500).json({ message: 'Failed to settle payments', error: err?.message || String(err) });
  }
});

module.exports = router;
