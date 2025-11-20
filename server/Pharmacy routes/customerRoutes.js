const express = require('express');
const router = express.Router();
const Customer = require('../Pharmacy  models/Customer');

// GET /api/pharmacy/customers/search?cnic=... | ?phone=... | ?mrNumber=...
// Returns a single customer matched by the first provided identifier.
router.get('/search', async (req, res) => {
  try {
    const { cnic, phone, mrNumber } = req.query;

    const query = cnic
      ? { cnic: String(cnic).trim() }
      : phone
      ? { phone: String(phone).trim() }
      : mrNumber
      ? { mrNumber: String(mrNumber).trim() }
      : null;

    if (!query) {
      return res.status(400).json({ error: 'Provide one of: cnic, phone, mrNumber' });
    }

    const customer = await Customer.findOne(query).lean();
    res.json(customer || null);
  } catch (err) {
    console.error('Error searching customer', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/customers - get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error('Error fetching customers', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/customers - add new customer
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.id;
    const customer = new Customer(data);
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    console.error('Error creating customer', err);
    res.status(400).json({ message: 'Invalid data' });
  }
});

// PUT /api/customers/:id - update customer
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    const updated = await Customer.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: 'Customer not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating customer', err);
    res.status(400).json({ message: 'Invalid data' });
  }
});

// DELETE /api/customers/:id - delete customer
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error('Error deleting customer', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
