const express = require('express');
const { body, validationResult } = require('express-validator');
let bcrypt; try { bcrypt = require('bcryptjs'); } catch { bcrypt = null; }
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const FinanceUser = require('../models/FinanceUser');

const router = express.Router();

router.post('/login', [
  body('username').isLength({ min: 3 }),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { username, password } = req.body;
  const user = await FinanceUser.findOne({ username });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const hash = user.passwordHash || '';
  const sha256 = (s)=> crypto.createHash('sha256').update(String(s)).digest('hex');
  let ok = false;
  if (hash && hash.startsWith('$2') && bcrypt) {
    try { ok = await bcrypt.compare(password, hash); } catch { ok = false; }
  } else if (hash) {
    ok = sha256(password) === hash;
  } else {
    // If no password set, reject
    ok = false;
  }
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ uid: user._id, role: 'finance', username }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
  res.json({ token, role: 'finance', username });
});

router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')? auth.slice(7): null;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    res.json({ ok: true, user: { id: payload.uid, role: payload.role, username: payload.username } });
  } catch (e) {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

module.exports = router;
