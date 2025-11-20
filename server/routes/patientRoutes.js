const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Token = require('../models/Token');
// Prescription model removed: prescriptions are no longer stored

// Create patient
router.post('/', async (req, res) => {
  try {
    const patient = await Patient.create(req.body);
    
    // If doctorId is provided, create a token
    if (req.body.doctorId) {
      await Token.create({
        doctorId: req.body.doctorId,
        patientId: patient._id,
        dateTime: new Date(),
        tokenNumber: await Token.countDocuments({ doctorId: req.body.doctorId }) + 1
      });
    }
    
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Public history by MR number: return patient + OPD visits derived from Tokens only
// GET /api/patients/history/mr/:mrNumber
router.get('/history/mr/:mrNumber', async (req, res) => {
  try {
    const { mrNumber } = req.params;
    const patient = await Patient.findOne({ mrNumber }).lean();
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const tokens = await Token.find({ patientId: patient._id }).sort({ dateTime: -1 }).lean();

    const tokenVisits = tokens.map(t => ({
      dateTime: t.dateTime,
      department: t.department || 'OPD',
      doctor: t.doctor || '',
      fee: (typeof t.finalFee === 'number' ? t.finalFee : (typeof t.fee === 'number' ? t.fee : 0)) || 0,
      symptoms: t.symptoms || '',
      diagnosis: t.diagnosis || '',
      prescription: null,
      _source: 'token',
    }));

    const byDay = new Map();
    for (const v of tokenVisits) {
      const d = new Date(v.dateTime);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const existing = byDay.get(key);
      if (!existing) {
        byDay.set(key, v);
      }
    }
    const visits = Array.from(byDay.values()).sort((a,b) => new Date(b.dateTime) - new Date(a.dateTime));

    return res.json({ ...patient, visits });
  } catch (err) {
    console.error('[patients] GET /history/mr/:mrNumber error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Prescriptions endpoint removed

// Get all patients or search by phone/mrNumber: ?phone=xyz or ?mrNumber=MR123
router.get('/', async (req, res) => {
  try {
    const { phone, mrNumber } = req.query;
    let filter = {};
    if (phone) filter.phone = phone;
    if (mrNumber) filter.mrNumber = mrNumber;
    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) {
    console.error('[patients] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get patient by phone via path param
router.get('/phone/:phone', async (req, res) => {
  try {
    const patient = await Patient.findOne({ phone: req.params.phone });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    console.error('[patients] GET /phone/:phone error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get patient by MR number via path param
router.get('/mr/:mrNumber', async (req, res) => {
  try {
    const patient = await Patient.findOne({ mrNumber: req.params.mrNumber });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    console.error('[patients] GET /mr/:mrNumber error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single patient
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update patient
router.put('/:id', async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Patient.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Patient not found' });
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
