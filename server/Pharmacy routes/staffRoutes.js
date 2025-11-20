const express = require('express');
const Staff = require('../Pharmacy  models/Staff');

const router = express.Router();

// Create new staff
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    delete data._id;

    const staff = await Staff.create(data);
    res.status(201).json(staff);
  } catch (err) {
    console.error('Create-staff error:', err.message, req.body);
    res.status(400).json({ message: err.message });
  }
});

// List all staff
router.get('/', async (_req, res) => {
  const staff = await Staff.find();
  res.json(staff);
});

// Get single staff
router.get('/:id', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Not found' });
    res.json(staff);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update staff
router.patch('/:id', async (req, res) => {
  try {
    const updated = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete staff
router.delete('/:id', async (req, res) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Clock In
router.post('/:id/clock-in', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Not found' });

    const today = new Date();
    const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // find existing attendance record for today
    let attendance = staff.attendance.find(a => a.date.getTime() === dateOnly.getTime());
    if (!attendance) {
      attendance = { date: dateOnly, status: 'present', checkIn: null, checkOut: null };
      staff.attendance.push(attendance);
    }

    attendance.checkIn = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    attendance.status = 'present';

    await staff.save();
    res.json(attendance);
  } catch (err) {
    console.error('Clock-in error', err.message);
    res.status(400).json({ message: err.message });
  }
});

// --- Attendance Summary Endpoints ---
// GET /attendance/daily?date=YYYY-MM-DD
router.get('/attendance/daily', async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    // fetch staff having attendance today
    const start = dateOnly;
    const end = new Date(dateOnly);
    end.setDate(end.getDate() + 1);
    const staff = await Staff.find({ 'attendance.date': { $gte: start, $lt: end } });
    const rows = staff.map((s) => {
      const rec = s.attendance.find((a) => a.date >= start && a.date < end);
      return { staffId: s._id, name: s.name, ...rec.toObject() };
    });
    res.json(rows);
  } catch (err) {
    console.error('daily summary error', err.message);
    res.status(400).json({ message: err.message });
  }
});

// GET /attendance/monthly?month=YYYY-MM
router.get('/attendance/monthly', async (req, res) => {
  try {
    const base = req.query.month ? new Date(req.query.month + '-01') : new Date();
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);

    const staff = await Staff.find({ 'attendance.date': { $gte: start, $lt: end } });
    const rows = staff.map((s) => {
      const monthRecs = s.attendance.filter((a) => a.date >= start && a.date < end);
      const count = (st) => monthRecs.filter((r) => r.status === st).length;
      return {
        staffId: s._id,
        name: s.name,
        present: count('present'),
        absent: count('absent'),
        leave: count('leave'),
        halfDay: count('half-day'),
      };
    });
    res.json(rows);
  } catch (err) {
    console.error('monthly summary error', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Clock Out
router.post('/:id/clock-out', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Not found' });

    const today = new Date();
    const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const attendance = staff.attendance.find(a => a.date.getTime() === dateOnly.getTime());
    if (!attendance) return res.status(400).json({ message: 'Clock-in first' });

    attendance.checkOut = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    await staff.save();
    res.json(attendance);
  } catch (err) {
    console.error('Clock-out error', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Add manual attendance
router.post('/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, status, notes = '', checkIn = null, checkOut = null } = req.body;

    if (!date || !status) {
      return res.status(400).json({ message: 'date and status required' });
    }

    const staff = await Staff.findById(id);
    if (!staff) return res.status(404).json({ message: 'Not found' });

    // push record
    staff.attendance.push({ date: new Date(date), status, notes, checkIn, checkOut });
    await staff.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('manual attendance error', err.message);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
