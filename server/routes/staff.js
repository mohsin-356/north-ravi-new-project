const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { verifyJWT, authorizeRoles } = require('../middleware/auth');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');

const router = Router();

// Protect all routes; adjust role as needed (e.g., admin or labTech)
router.use(verifyJWT, authorizeRoles(['admin', 'labTech']));

// ---------------- Staff CRUD ----------------

// List staff with attendance records
router.get('/', async (_req, res) => {
  try {
    const [staffDocs, attendanceDocs] = await Promise.all([
      Staff.find().lean(),
      Attendance.find().lean(),
    ]);
    const attendanceByStaff = {};
    attendanceDocs.forEach((rec) => {
      const key = String(rec.staffId);
      if (!attendanceByStaff[key]) attendanceByStaff[key] = [];
      attendanceByStaff[key].push({
        ...rec,
        checkIn: rec.checkInTime,
        checkOut: rec.checkOutTime,
      });
    });
    const staff = staffDocs.map((s) => ({
      ...s,
      attendance: attendanceByStaff[String(s._id)] || [],
    }));
    return res.json(staff);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to list staff' });
  }
});

// Create staff
router.post('/', [body('name').notEmpty(), body('position').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const created = await Staff.create(req.body);
    return res.status(201).json(created);
  } catch (err) {
    console.error('Staff create error', err);
    return res.status(500).json({ message: 'Failed to create staff' });
  }
});

// Update staff
router.put('/:id', async (req, res) => {
  try {
    const updated = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Staff not found' });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update staff' });
  }
});

// Delete staff
router.delete('/:id', async (req, res) => {
  try {
    const removed = await Staff.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Staff not found' });
    return res.json({});
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete staff' });
  }
});

module.exports = router;
