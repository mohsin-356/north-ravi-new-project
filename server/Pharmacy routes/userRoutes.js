const express = require('express');
const router = express.Router();
const User = require('../Pharmacy  models/User');

// Create a new user
router.post('/', async (req, res) => {
  try {
    let { username, password, role } = req.body;
    if (username) username = username.toLowerCase().trim();
    if (role) role = role.toLowerCase().trim();
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    const user = new User({ username, password, role });
    await user.save();
    const { password: _, ...userData } = user.toObject();
    res.status(201).json(userData);
  } catch (err) {
    console.error('Create user error:', err);
    let msg = 'Failed to create user due to a server error.';
    if (err.code === 11000) {
      msg = 'This username is already taken.';
      return res.status(409).json({ message: msg });
    }
    if (err.name === 'ValidationError') {
      msg = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: msg });
  }
});

// Get all users (excluding passwords)
router.get('/', async (_req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get a user by ID (excluding password)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error('Get user by ID error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update a user by ID
router.put('/:id', async (req, res) => {
  try {
    let { username, password, role } = req.body;
    if (username) username = username.toLowerCase().trim();
    if (role) role = role.toLowerCase().trim();
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
    console.error('Update user error:', err);
    let msg = err.message;
    if (err.code === 11000) msg = 'Username already exists.';
    if (err.name === 'ValidationError') {
      msg = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: msg });
  }
});

// Delete a user by ID
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    // Auto-seed a default admin if no pharmacy users exist
    try {
      const total = await User.countDocuments();
      if (total === 0) {
        await new User({ username: 'admin1', password: 'admin123', role: 'admin' }).save();
        console.log('[pharmacy-users] Seeded default admin: admin1 / admin123');
      }
    } catch (seedErr) {
      console.warn('[pharmacy-users] Failed to check/seed default admin:', seedErr?.message || seedErr);
    }
    const uname = username.toString().toLowerCase().trim();
    const user = await User.findOne({ username: uname });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }
    const { password: _, ...userData } = user.toObject();
    res.json(userData);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 