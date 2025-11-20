const express = require('express');
const router = express.Router();
// Optional authentication: we will try to decode token if present but do not require it
let jwt;
try { jwt = require('jsonwebtoken'); } catch {}
const AuditLog = require('../models/AuditLog');

// Create audit log (anonymous-friendly, immediate 204 response)
router.post('/', (req, res) => {
  const body = req.body || {};
  const { action, module, details, timestamp } = body;
  if (!action) {
    return res.status(400).json({ message: 'action is required' });
  }

  // Reply to client immediately so audit can never block the UX
  res.status(204).end();

  // Continue asynchronously, fully isolated from the request lifecycle
  setImmediate(async () => {
    try {
      // Extract user from Authorization header if present; otherwise proceed anonymous
      let user = req.user || req.userData || {};
      try {
        if ((!user || !user.id) && req.headers && req.headers.authorization) {
          const parts = String(req.headers.authorization).split(' ');
          const token = parts.length === 2 ? parts[1] : '';
          if (jwt && token) {
            const decoded = jwt.decode(token) || {};
            user = {
              id: decoded.id || decoded._id || decoded.userId,
              _id: decoded._id || decoded.id,
              username: decoded.username || decoded.name,
              name: decoded.name,
              role: decoded.role,
            };
          }
        }
      } catch {}

      // Sanitize details: ensure it is JSON-serializable
      let finalDetails = details;
      try {
        if (typeof details === 'object' && details !== null) {
          const seen = new WeakSet();
          const json = JSON.stringify(details, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) return '[Circular]';
              seen.add(value);
            }
            return value;
          });
          finalDetails = JSON.parse(json);
        }
      } catch (_) {
        try { finalDetails = String(details); } catch { finalDetails = undefined; }
      }

      try {
        await AuditLog.create({
          action,
          module,
          details: finalDetails,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          userId: user?.id || user?._id || null,
          username: user?.username || user?.name || null,
          role: user?.role || null,
        });
      } catch (err) {
        console.error('[audit] async insert failed:', err?.stack || err?.message || err);
      }
    } catch (err) {
      console.error('[audit] unexpected async error:', err?.stack || err?.message || err);
    }
  });
});

// List audit logs with pagination and filters (no required auth)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.module) filter.module = req.query.module;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.dateFrom || req.query.dateTo) {
      filter.timestamp = {};
      if (req.query.dateFrom) filter.timestamp.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.timestamp.$lte = new Date(req.query.dateTo);
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: err?.message || 'Failed to list audit logs' });
  }
});

module.exports = router;
