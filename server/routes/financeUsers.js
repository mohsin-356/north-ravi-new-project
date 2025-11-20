const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');

// Simple hasher (not for production; replace with bcrypt/argon2 in secure setups)
function hashPassword(plain){
  return crypto.createHash('sha256').update(String(plain)).digest('hex');
}

// Primary model and alternate (for legacy collection names)
const FinanceUser = require('../models/FinanceUser'); // collection: financeusers
let FinanceUserAlt;
try {
  FinanceUserAlt = mongoose.model('FinanceUserAlt');
} catch {
  const altSchema = new mongoose.Schema(
    { username: String, role: String, active: Boolean, email: String, passwordHash: String },
    { timestamps: true, collection: 'finanaceusers' }
  );
  FinanceUserAlt = mongoose.model('FinanceUserAlt', altSchema);
}

console.log('[finance-users] routes file loaded');

// GET /api/finance/users
router.get('/', async (req, res) => {
  try { console.log('[finance-users] GET /'); } catch {}
  try {
    const primary = await FinanceUser.find().sort({ createdAt: -1 }).lean();
    let merged = primary;
    try {
      const alt = await FinanceUserAlt.find().sort({ createdAt: -1 }).lean();
      const seen = new Set(primary.map(u => u.username));
      merged = primary.concat(alt.filter(u => !seen.has(u.username)));
    } catch {}
    res.json(merged);
  } catch (e) {
    res.status(500).json({ error: 'failed_to_list_users' });

// POST /api/finance/users/:id/change-password
router.post('/:id/change-password', async (req, res) => {
  try { console.log('[finance-users] POST /:id/change-password'); } catch {}
  try {
    const { id } = req.params;
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'password_required' });
    const passwordHash = hashPassword(password);
    let doc = await FinanceUser.findByIdAndUpdate(id, { $set: { passwordHash } }, { new: true });
    if (!doc) {
      doc = await FinanceUserAlt.findByIdAndUpdate(id, { $set: { passwordHash } }, { new: true });
      if (!doc) return res.status(404).json({ error: 'not_found' });
    }
    // mirror by username into alt if we updated primary
    try { await FinanceUserAlt.updateOne({ username: doc.username }, { $set: { passwordHash } }); } catch {}
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'failed_to_change_password' });
  }
});
  }
});

// POST /api/finance/users
router.post('/', async (req, res) => {
  try { console.log('[finance-users] POST /'); } catch {}
  try {
    const { username, role = 'finance', active = true, email, password } = req.body || {};
    if (!username) return res.status(400).json({ error: 'username_required' });
    const passwordHash = password ? hashPassword(password) : undefined;

    const saved = await FinanceUser.create({ username, role, active, email, passwordHash });
    try { await FinanceUserAlt.updateOne({ username }, { $set: { username, role, active, email, passwordHash } }, { upsert: true }); } catch {}
    res.status(201).json(saved);
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ error: 'username_exists' });
    res.status(500).json({ error: 'failed_to_create_user' });
  }
});

// POST /api/finance/users/:id/toggle
router.post('/:id/toggle', async (req, res) => {
  try { console.log('[finance-users] POST /:id/toggle'); } catch {}
  try {
    const { id } = req.params;
    let doc = await FinanceUser.findById(id);
    if (!doc) {
      doc = await FinanceUserAlt.findById(id);
      if (!doc) return res.status(404).json({ error: 'not_found' });
      doc.active = !doc.active;
      await doc.save();
      return res.json({ ok: true, active: doc.active });
    }
    doc.active = !doc.active;
    await doc.save();
    try { await FinanceUserAlt.updateOne({ username: doc.username }, { $set: { active: doc.active } }); } catch {}
    res.json({ ok: true, active: doc.active });
  } catch (e) {
    res.status(500).json({ error: 'failed_to_toggle' });
  }
});

// DELETE /api/finance/users/:id
router.delete('/:id', async (req, res) => {
  try { console.log('[finance-users] DELETE /:id'); } catch {}
  try {
    const { id } = req.params;
    const doc = await FinanceUser.findByIdAndDelete(id);
    if (doc?.username) { try { await FinanceUserAlt.deleteOne({ username: doc.username }); } catch {} }
    else { try { await FinanceUserAlt.findByIdAndDelete(id); } catch {} }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'failed_to_delete' });
  }
});

// POST /api/finance/users/:id/reset-invite
router.post('/:id/reset-invite', async (req, res) => {
  try { console.log('[finance-users] POST /:id/reset-invite'); } catch {}
  try {
    // TODO: integrate with email/SMS service
    res.json({ ok: true, message: 'invite_sent' });
  } catch (e) {
    res.status(500).json({ error: 'failed_to_send_invite' });
  }
});

module.exports = router;
