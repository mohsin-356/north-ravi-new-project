const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const Patient = require('../models/Patient');
const Settings = require('../models/Settings');

// Helper: get next token number and update settings counters
async function getNextTokenNumber() {
  const settings = await Settings.findById('settings');
  const today = new Date().toDateString();

  if (!settings) {
    const newSettings = await Settings.create({});
    newSettings.lastTokenDate = today;
    newSettings.dailyTokenCounter = 2; // first token "1" will be used now
    await newSettings.save();
    return '001';
  }

  if (settings.lastTokenDate !== today) {
    settings.dailyTokenCounter = 2; // next after 1
    settings.lastTokenDate = today;
    await settings.save();
    return '001';
  }

  const tokenNumber = String(settings.dailyTokenCounter).padStart(3, '0');
  settings.dailyTokenCounter += 1;
  await settings.save();
  return tokenNumber;
}

// Helper: get next MR number (format: MR-YYYYMM-###) and persist counter in Settings
async function getNextMrNumber() {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  let settings = await Settings.findById('settings');
  if (!settings) {
    settings = await Settings.create({});
  }
  const current = Number(settings.mrCounters?.get(yyyymm) || 0) + 1;
  settings.mrCounters.set(yyyymm, current);
  settings.lastMRYear = String(now.getFullYear());
  await settings.save();
  return `MR-${yyyymm}-${String(current).padStart(3, '0')}`;
}

// POST / create token
router.post('/', async (req, res) => {
  try {
    let { patientId, patientName, mrNumber } = req.body;

    // If client supplied an MR in a non-canonical format (e.g. "MR-5"), ignore and generate server MR.
    const canonical = /^MR-\d{6}-\d{3}$/;
    if (!mrNumber || !canonical.test(String(mrNumber))) {
      mrNumber = await getNextMrNumber();
    }

    // If patientId not provided, try to find by MR first
    if (!patientId && mrNumber) {
      const existingByMr = await Patient.findOne({ mrNumber }).lean();
      if (existingByMr) patientId = existingByMr._id;
    }

    // Create patient if still no id
    if (!patientId) {
      try {
        const payload = { ...req.body, name: patientName, mrNumber };
        if (!payload.mrNumber) payload.mrNumber = mrNumber;
        const patient = await Patient.create(payload);
        patientId = patient._id;
      } catch (e) {
        // Handle race/duplicate MR: reuse existing patient
        if (e && e.code === 11000 && e.keyPattern && e.keyPattern.mrNumber) {
          const existing = await Patient.findOne({ mrNumber }).lean();
          if (existing) {
            patientId = existing._id;
          } else {
            // regenerate MR and retry once
            mrNumber = await getNextMrNumber();
            const patient = await Patient.create({ ...req.body, name: patientName, mrNumber });
            patientId = patient._id;
          }
        } else {
          throw e;
        }
      }
    } else if (patientId && mrNumber) {
      // Ensure patient's mrNumber is populated
      const existing = await Patient.findById(patientId);
      if (existing && existing.mrNumber !== mrNumber) {
        existing.mrNumber = mrNumber;
        await existing.save();
      }
    }

    const tokenNumber = await getNextTokenNumber();
    const token = await Token.create({ ...req.body, mrNumber, tokenNumber, patientId });

    // Corporate panels removed: no CorporateTransaction logging
    res.status(201).json(token);
  } catch (err) {
    console.error('Token create error:', err);
    res.status(400).json({ error: err.message || 'Failed to create token' });
  }
});

// GET tokens (single day via ?date=yyyy-mm-dd, or date range via ?dateFrom&dateTo)
// Optional pagination: ?page=1&limit=20 returns { items, total, page, limit }
router.get('/', async (req, res) => {
  try {
    const { date, dateFrom, dateTo } = req.query; // yyyy-mm-dd (local)
    const page = Math.max(parseInt(req.query.page || '0', 10), 0);
    const limit = Math.max(parseInt(req.query.limit || '0', 10), 0);

    const filter = {};
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      filter.dateTime = { $gte: start, $lt: end };
    } else if (dateFrom || dateTo) {
      const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : new Date('1970-01-01T00:00:00');
      const end = dateTo ? new Date(`${dateTo}T23:59:59.999`) : new Date('2999-12-31T23:59:59.999');
      filter.dateTime = { $gte: start, $lt: end };
    }

    if (page > 0 && limit > 0) {
      const total = await Token.countDocuments(filter);
      const items = await Token.find(filter).sort({ dateTime: -1 }).skip((page - 1) * limit).limit(limit).lean();
      return res.json({ items, total, page, limit });
    }

    const tokens = await Token.find(filter).sort({ dateTime: -1 }).lean();
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update token
router.put('/:id', async (req, res) => {
  try {
    const token = await Token.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!token) return res.status(404).json({ message: 'Token not found' });
    res.json(token);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete token
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Token.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Token not found' });
    res.json({ message: 'Token deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
