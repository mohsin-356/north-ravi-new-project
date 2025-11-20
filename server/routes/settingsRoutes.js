const express = require('express');
const router = express.Router();

const Settings = require('../models/Settings');

// GET hospital settings (single doc)
router.get('/', async (_, res) => {
  try {
    const settings = await Settings.findById('settings');
    res.json(settings || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE or UPDATE settings (upsert by fixed id "settings")
router.put('/', async (req, res) => {
  try {
    const update = req.body;
    const settings = await Settings.findByIdAndUpdate('settings', update, {
      new: true,
      upsert: true, // create if not exists
      setDefaultsOnInsert: true,
    });
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
