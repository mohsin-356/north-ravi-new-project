const express = require('express');
const router = express.Router();
const Settings = require('../Indoor models/Settings');

async function getSettingsDoc() {
  let doc = await Settings.findOne();
  if (!doc) doc = await Settings.create({});
  return doc;
}

// GET /api/indoor/settings
router.get('/', async (_req, res) => {
  try {
    const settings = await getSettingsDoc();
    res.json(settings);
  } catch (err) { res.status(500).json({ message: 'Failed to fetch settings' }); }
});

// PUT /api/indoor/settings
router.put('/', async (req, res) => {
  try {
    const doc = await getSettingsDoc();
    Object.assign(doc, req.body || {});
    await doc.save();
    res.json(doc);
  } catch (err) { res.status(500).json({ message: 'Failed to update settings' }); }
});

module.exports = router;
