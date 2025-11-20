const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username & password are required' });

    // Ensure a default admin exists (even if other users exist)
    try {
      let adminUser = await User.findOne({ username: { $regex: /^admin$/i } });
      if (!adminUser) {
        await User.create({ username: 'admin', password: '123', role: 'admin' });
        console.log('[hospital-users] Ensured default admin: admin / 123');
      } else {
        // Ensure known default password for development convenience
        try {
          const ok = await adminUser.comparePassword('123');
          if (!ok) {
            adminUser.password = '123';
            await adminUser.save();
            console.log('[hospital-users] Reset admin password to default 123');
          }
        } catch {}
      }
    } catch (seedErr) {
      console.warn('[hospital-users] Failed to check/seed default admin:', seedErr?.message || seedErr);
    }

    const uname = String(username).trim().toLowerCase();
    console.log('[login:hospital] attempt for username =', uname);
    // Case-insensitive match to tolerate legacy data with different casing
    const user = await User.findOne({ username: { $regex: new RegExp(`^${uname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
    if (!user) {
      console.warn('[login:hospital] user not found for', uname);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn('[login:hospital] password mismatch for', uname);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Issue JWT with user id and role so protected routes can authorize properly
    // For doctors, also include the associated doctorId (from Doctor collection)
    let payload = { id: user._id.toString(), role: user.role, username: user.username };
    if (user.role === 'doctor') {
      try {
        const Doctor = require('../models/Doctor');
        // Match doctor by username or email (support both link styles)
        const doc = await Doctor.findOne({ $or: [ { username: user.username }, { email: user.username } ] });
        if (doc) {
          payload = { ...payload, doctorId: doc._id.toString() };
        }
      } catch (_) {
        // non-fatal, continue without doctorId
      }
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    return res.json({ ...payload, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create User
router.post('/', async (req, res) => {
  console.log('Full user creation request:', {
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Simple validation - we'll expand this after seeing actual errors
    if (!req.body.username || !req.body.password) {
      console.error('Basic validation failed');
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = await User.create({
      username: req.body.username,
      password: req.body.password,
      role: req.body.role || 'doctor',
      mustChangePassword: !!req.body.mustChangePassword
    });
    console.log('User created successfully');
    res.status(201).json(user);
  } catch (err) {
    // Handle duplicate username error gracefully
    if (err && err.code === 11000 && err.keyPattern && err.keyPattern.username) {
      return res.status(409).json({ error: 'Username already exists', field: 'username' });
    }
    console.error('Full error details:', {
      message: err.message,
      stack: err.stack,
      errors: err.errors,
      body: req.body
    });
    res.status(400).json({ 
      error: err.message,
      details: err.errors 
    });
  }
});

// Get all users
router.get('/', async (_, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check username
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    const exists = await User.exists({ username });
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    if (err && err.code === 11000 && err.keyPattern && err.keyPattern.username) {
      return res.status(409).json({ error: 'Username already exists', field: 'username' });
    }
    res.status(400).json({ error: err.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
