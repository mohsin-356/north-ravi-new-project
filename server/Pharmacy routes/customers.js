const express = require('express');
const router = express.Router();
const Customer = require('../Pharmacy  models/Customer');

// GET /api/customers/search?cnic=xxxxx -> find by CNIC
router.get('/search', async (req, res) => {
  try {
    const { cnic } = req.query;
    if (!cnic) {
      return res.status(400).json({ error: 'cnic query param required' });
    }
    const customer = await Customer.findOne({ cnic: cnic.trim() }).lean();
    if (!customer) return res.json(null);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
