const express = require('express');
const router = express.Router();
const User = require('../Indoor models/User');

// Create user
router.post('/', async (req, res) => {
  try {
    let { username, password, role } = req.body || {};
    if (username) username = String(username).toLowerCase().trim();
    if (role) role = String(role).toLowerCase().trim();
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });
    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ message: 'Username already exists.' });
    const user = new User({ username, password, role });
    await user.save();
    const { password: _, ...userData } = user.toObject();
    res.status(201).json(userData);
  } catch (err) {
    let msg = 'Failed to create user';
    if (err?.code === 11000) msg = 'This username is already taken.';
    if (err?.name === 'ValidationError') msg = Object.values(err.errors).map(e => e.message).join(', ');
    res.status(500).json({ message: msg });
  }
});

// Get all users (no password)
router.get('/', async (_req, res) => {
  try { const users = await User.find({}, '-password'); res.json(users); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// Get by ID
router.get('/:id', async (req, res) => {
  try { const u = await User.findById(req.params.id).select('-password'); if (!u) return res.status(404).json({ message: 'User not found.' }); res.json(u); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    let { username, password, role } = req.body || {};
    if (username) username = String(username).toLowerCase().trim();
    if (role) role = String(role).toLowerCase().trim();
    const update = {};
    if (username) update.username = username;
    if (role) update.role = role;
    if (password) update.password = password;
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    Object.assign(user, update);
    await user.save();
    const { password: _, ...userData } = user.toObject();
    res.json(userData);
  } catch (err) {
    let msg = err?.message || 'Failed to update user';
    if (err?.code === 11000) msg = 'Username already exists.';
    if (err?.name === 'ValidationError') msg = Object.values(err.errors).map(e => e.message).join(', ');
    res.status(500).json({ message: msg });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try { const u = await User.findByIdAndDelete(req.params.id); if (!u) return res.status(404).json({ message: 'User not found.' }); res.json({ message: 'User deleted.' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });
    // Auto-seed indoor admin if empty
    try {
      const total = await User.countDocuments();
      if (total === 0) {
        await new User({ username: 'admin1', password: 'admin123', role: 'admin' }).save();
        console.log('[indoor-users] Seeded default admin: admin1 / admin123');
      }
    } catch {}
    const uname = String(username).toLowerCase().trim();
    const user = await User.findOne({ username: uname });
    if (!user) return res.status(401).json({ message: 'Invalid username or password.' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid username or password.' });
    const { password: _, ...userData } = user.toObject();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ message: err?.message || 'Login failed' });
  }
});

module.exports = router;
