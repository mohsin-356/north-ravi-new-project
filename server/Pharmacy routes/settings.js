const express = require('express');
const router = express.Router();
const Settings = require('../Pharmacy  models/Settings');

// Helper: fetch (or create) the single settings document
async function getSettingsDoc() {
  let doc = await Settings.findOne();
  if (!doc) {
    doc = await Settings.create({}); // will use schema defaults
  }
  return doc;
}

// GET /api/settings -> return current settings
router.get('/', async (req, res) => {
  try {
    const settings = await getSettingsDoc();
    res.json(settings);
  } catch (err) {
    console.error('Failed to fetch settings:', err);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// PUT /api/settings -> update and return settings
router.put('/', async (req, res) => {
  try {
    const update = req.body;
    const doc = await getSettingsDoc();

    Object.assign(doc, update);
    await doc.save();

    res.json(doc);
  } catch (err) {
    console.error('Failed to update settings:', err);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

module.exports = router; 