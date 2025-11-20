const express = require('express');
const router = express.Router();
const StaffSettings = require('../Pharmacy  models/StaffSettings');

// Helper to get (or create default) settings doc
async function getSettingsDoc() {
  let doc = await StaffSettings.findOne();
  if (!doc) {
    doc = await StaffSettings.create({}); // uses defaults
  }
  return doc;
}

// GET /api/staff-settings -> returns global settings
router.get('/', async (req, res) => {
  try {
    const settings = await getSettingsDoc();
    res.json(settings);
  } catch (err) {
    console.error('Failed to fetch staff settings:', err);
    res.status(500).json({ message: 'Failed to fetch staff settings' });
  }
});

// PUT /api/staff-settings -> update global settings
router.put('/', async (req, res) => {
  try {
    const update = req.body;
    const doc = await getSettingsDoc();

    Object.assign(doc, update);
    await doc.save();

    res.json(doc);
  } catch (err) {
    console.error('Failed to update staff settings:', err);
    res.status(500).json({ message: 'Failed to update staff settings' });
  }
});

module.exports = router;
