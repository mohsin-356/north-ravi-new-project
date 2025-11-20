const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { verifyJWT, authorizeRoles } = require('../middleware/auth');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');

const router = Router();
router.use(verifyJWT, authorizeRoles(['admin', 'labTech', 'researcher']));

// Get daily attendance ?date=YYYY-MM-DD[&page=N&limit=M]
router.get('/', async (req, res) => {
  const { date, page, limit } = req.query || {};
  if (!date) return res.status(400).json({ message: 'date query param required' });

  // If page & limit provided, return paginated results with X-Total-Count header
  const p = Number(page);
  const l = Number(limit);
  const isPaged = Number.isFinite(p) && p > 0 && Number.isFinite(l) && l > 0;

  if (isPaged) {
    const total = await Attendance.countDocuments({ date });
    const list = await Attendance.find({ date })
      .skip((p - 1) * l)
      .limit(l)
      .lean();
    const transformed = list.map((rec) => ({
      ...rec,
      name: rec.staffName,
      checkIn: rec.checkInTime,
      checkOut: rec.checkOutTime,
    }));
    res.set('X-Total-Count', String(total));
    return res.json(transformed);
  }

  // Legacy non-paginated response
  const list = await Attendance.find({ date }).lean();
  const transformed = list.map((rec) => ({
    ...rec,
    name: rec.staffName,
    checkIn: rec.checkInTime,
    checkOut: rec.checkOutTime,
  }));
  return res.json(transformed);
});

// Add attendance record
router.post('/', [
  body('staffId').notEmpty(),
  body('date').notEmpty(),
  body('status').isIn(['present', 'absent', 'leave']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const staff = await Staff.findById(req.body.staffId);
  if (!staff) return res.status(404).json({ message: 'Staff not found' });
  try {
    const created = await Attendance.create({ ...req.body, staffName: staff.name });
    return res.status(201).json(created);
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ message: 'Attendance already exists' });
    console.error(err);
    return res.status(500).json({ message: 'Failed to create attendance' });
  }
});

// Clock-in
router.post('/clock-in', [body('staffId').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { staffId } = req.body;
  const staff = await Staff.findById(staffId);
  if (!staff) return res.status(404).json({ message: 'Staff not found' });
  const today = new Date().toISOString().split('T')[0];
  const existing = await Attendance.findOne({ staffId, date: today });
  if (existing && existing.checkInTime) return res.status(409).json({ message: 'Already clocked in' });
  const rec = await Attendance.findOneAndUpdate(
    { staffId, date: today },
    { $set: { status: 'present', checkInTime: new Date().toISOString(), staffName: staff.name } },
    { upsert: true, new: true }
  ).lean();
  return res.status(201).json({ ...rec, checkIn: rec && rec.checkInTime });
});

// Monthly attendance ?staffId=...&month=YYYY-MM[&page=N&limit=M]
router.get('/monthly', async (req, res) => {
  const { staffId, month, page, limit } = req.query || {}; // month = YYYY-MM
  if (!staffId || !month) return res.status(400).json({ message: 'staffId and month query params required' });
  try {
    const p = Number(page);
    const l = Number(limit);
    const isPaged = Number.isFinite(p) && p > 0 && Number.isFinite(l) && l > 0;
    const filter = { staffId, date: { $regex: `^${month}` } };

    if (isPaged) {
      const total = await Attendance.countDocuments(filter);
      const list = await Attendance.find(filter)
        .skip((p - 1) * l)
        .limit(l)
        .lean();
      const transformed = list.map((rec) => ({
        ...rec,
        name: rec.staffName,
        checkIn: rec.checkInTime,
        checkOut: rec.checkOutTime,
      }));
      res.set('X-Total-Count', String(total));
      return res.json(transformed);
    }

    const list = await Attendance.find(filter).lean();
    const transformed = list.map((rec) => ({
      ...rec,
      name: rec.staffName,
      checkIn: rec.checkInTime,
      checkOut: rec.checkOutTime,
    }));
    return res.json(transformed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch monthly attendance' });
  }
});

// Clock-out
router.post('/clock-out', [body('staffId').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { staffId } = req.body;
  const staff = await Staff.findById(staffId);
  if (!staff) return res.status(404).json({ message: 'Staff not found' });
  const today = new Date().toISOString().split('T')[0];
  const existing = await Attendance.findOne({ staffId, date: today });
  if (existing && existing.checkOutTime) return res.status(409).json({ message: 'Already clocked out' });
  const rec = await Attendance.findOneAndUpdate(
    { staffId, date: today },
    { $set: { checkOutTime: new Date().toISOString(), staffName: staff.name }, $setOnInsert: { status: 'present' } },
    { upsert: true, new: true }
  ).lean();
  return res.status(201).json({ ...rec, checkOut: rec && rec.checkOutTime });
});

module.exports = router;
