const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const User = require('../models/User'); // Assuming User model is defined in this file
const Token = require('../models/Token');
const DoctorLedger = require('../models/DoctorLedger');

// Create doctor
router.post('/', async (req, res) => {
  try {
    const { name, email, username, cnic, specialization, phone, consultationFee, commissionRate } = req.body;
    
    // Validate required fields (email no longer required)
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Create doctor
    const doctor = new Doctor({
      name,
      email,
      username,
      cnic,
      specialization,
      phone,
      consultationFee,
      commissionRate
    });
    
    await doctor.save();
    res.status(201).json(doctor);
  } catch (err) {
    console.error('[doctors] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await Doctor.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get today's tokens for the logged-in doctor (for Doctor Portal queue)
router.get('/tokens/today', async (req, res) => {
  try {
    // Determine doctorId: prefer req.user.doctorId; fallback to req.user.id; or query param
    const user = req.user || {};
    const doctorId = user.doctorId || user._id || user.id || req.query.doctorId;
    if (!doctorId) return res.status(400).json({ error: 'doctorId missing' });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const tokens = await Token.find({
      doctorId: doctorId,
      dateTime: { $gte: start, $lte: end },
    })
      .sort({ dateTime: 1 })
      .populate('patientId', 'name mrNumber phone');

    res.json(tokens);
  } catch (err) {
    console.error('[doctor] GET /tokens/today error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all doctors with real-time performance stats
router.get('/', async (_req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 }).populate('departmentId');

    // Define start/end of today for "today" metrics
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // Aggregate overall stats per doctor
    const overallAgg = await Token.aggregate([
      {
        $project: {
          doctorId: 1,
          patientId: 1,
          finalFee: { $ifNull: ['$finalFee', null] },
          feeNum: { $convert: { input: '$fee', to: 'double', onError: 0, onNull: 0 } },
          discountNum: { $convert: { input: '$discount', to: 'double', onError: 0, onNull: 0 } },
        }
      },
      {
        $addFields: {
          feeNet: { $ifNull: ['$finalFee', { $subtract: ['$feeNum', '$discountNum'] }] }
        }
      },
      {
        $group: {
          _id: '$doctorId',
          totalRevenue: { $sum: '$feeNet' },
          patientsSet: { $addToSet: '$patientId' },
        },
      },
      {
        $project: {
          totalRevenue: 1,
          patientsChecked: { $size: '$patientsSet' },
        },
      },
    ]);

    // Aggregate today's tokens per doctor
    const todayAgg = await Token.aggregate([
      { $match: { dateTime: { $gte: start, $lte: end } } },
      {
        $project: {
          doctorId: 1,
          finalFee: { $ifNull: ['$finalFee', null] },
          feeNum: { $convert: { input: '$fee', to: 'double', onError: 0, onNull: 0 } },
          discountNum: { $convert: { input: '$discount', to: 'double', onError: 0, onNull: 0 } },
        }
      },
      {
        $addFields: {
          feeNet: { $ifNull: ['$finalFee', { $subtract: ['$feeNum', '$discountNum'] }] }
        }
      },
      {
        $group: {
          _id: '$doctorId',
          tokensToday: { $sum: 1 },
          revenueToday: { $sum: '$feeNet' },
        },
      },
    ]);

    const overallByDoctor = new Map(overallAgg.map((a) => [a._id, a]));
    const todayByDoctor = new Map(todayAgg.map((a) => [a._id, a]));

    const result = doctors.map((d) => {
      const dId = d._id;
      const overall = overallByDoctor.get(dId) || {};
      const today = todayByDoctor.get(dId) || {};
      const totalRevenue = overall.totalRevenue || 0;
      const patientsChecked = overall.patientsChecked || 0;
      const commissionRate = typeof d.commissionRate === 'number' ? d.commissionRate : 0;
      const totalCommission = Math.round((totalRevenue * commissionRate) / 100);
      const tokensToday = today.tokensToday || 0;

      return {
        ...d.toObject(),
        totalRevenue,
        totalCommission,
        patientsChecked,
        tokensToday,
      };
    });

    try {
      const ledgerAgg = await DoctorLedger.aggregate([
        {
          $group: {
            _id: '$doctorId',
            credit: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] } },
            debit: { $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] } },
          },
        },
        { $project: { _id: 1, ledgerCredit: '$credit', ledgerDebit: '$debit', ledgerBalance: { $subtract: ['$credit', '$debit'] } } },
      ]);
      const ledgerByDoctor = new Map(ledgerAgg.map((a) => [a._id, a]));
      const merged = result.map((d) => {
        const ld = ledgerByDoctor.get(String(d._id)) || {};
        return { ...d, ledgerCredit: ld.ledgerCredit || 0, ledgerDebit: ld.ledgerDebit || 0, ledgerBalance: ld.ledgerBalance || 0 };
      });
      return res.json(merged);
    } catch (e) {
      return res.json(result);
    }
  } catch (err) {
    console.error('[doctors] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update doctor (+ sync linked user account when email/name/password change)
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const payload = { ...req.body };

    // Normalize numeric fields coming from UI as strings
    if (payload.consultationFee !== undefined) {
      payload.consultationFee = Number(payload.consultationFee);
    }
    if (payload.fee !== undefined) {
      payload.fee = Number(payload.fee);
    }
    if (payload.commissionRate !== undefined) {
      payload.commissionRate = Number(payload.commissionRate);
    }

    // Load existing doctor to track prior email (used as linked user.username)
    const existing = await Doctor.findById(id);
    if (!existing) return res.status(404).json({ message: 'Doctor not found' });

    const prevEmail = existing.email;
    const prevUsername = existing.username;

    // Assign fields and save doc so hooks (fee sync) run
    Object.assign(existing, payload);
    const updatedDoctor = await existing.save();

    // If doctor has an associated user (username === doctor.username or email), sync changes
    // Update username (prefer username field; fallback to email). Update password only if explicitly provided.
    const shouldUpdateUser = payload.username !== undefined || payload.email !== undefined || payload.name !== undefined || payload.password !== undefined;
    if (shouldUpdateUser) {
      // Try to find by previous username first; then by new username; then by emails
      let user = null;
      if (prevUsername) user = await User.findOne({ username: prevUsername });
      if (!user && payload.username) user = await User.findOne({ username: payload.username });
      if (!user && prevEmail) user = await User.findOne({ username: prevEmail });
      if (!user && payload.email) user = await User.findOne({ username: payload.email });
      if (user) {
        // Update the user's username to the preferred doctor username/email
        if (payload.username !== undefined && payload.username) user.username = payload.username;
        else if (payload.email !== undefined && payload.email) user.username = payload.email;
        if (payload.password !== undefined && payload.password !== '') {
          user.password = payload.password; // hashed by User pre('save')
          user.mustChangePassword = false;
        }
        await user.save();
      } else {
        // No linked user found. Create one if we have a username or email (new or previous).
        const username = payload.username || prevUsername || payload.email || prevEmail;
        if (username) {
          const crypto = require('crypto');
          const password = (payload.password && payload.password !== '') ? payload.password : crypto.randomBytes(8).toString('hex');
          const newUser = new User({
            username,
            password,
            role: 'doctor',
            mustChangePassword: !payload.password
          });
          await newUser.save();
          console.log(`[doctors] Created linked user for doctor ${id} with username ${username}`);
        }
      }
    }

    res.json(updatedDoctor);
  } catch (err) {
    console.error('[doctors] PUT /:id error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Delete doctor
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Doctor.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
