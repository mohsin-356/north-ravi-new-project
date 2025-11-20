const express = require('express');
const router = express.Router();
const AuditLog = require('../Indoor models/AuditLog');

// GET /api/indoor/audit-logs
router.get('/', async (req, res) => {
  try {
    const { search = '', action, limit = 100, skip = 0, startDate, endDate } = req.query || {};
    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    if (action && action !== 'all') filter.action = action;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [ { userName: regex }, { action: regex }, { details: regex } ];
    }
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    res.json(logs);
  } catch (err) { res.status(500).json({ message: 'Failed to fetch audit logs', error: err.message }); }
});

// POST /api/indoor/audit-logs
router.post('/', async (req, res) => {
  try {
    const { userId, userName, userRole, action, entityType, entityId, details, ipAddress } = req.body || {};
    if (!userId || !userName || !action) return res.status(400).json({ message: 'Missing required fields' });
    const log = new AuditLog({ userId, userName, userRole, action, entityType, entityId, details, ipAddress });
    await log.save();
    res.status(201).json(log);
  } catch (err) { res.status(500).json({ message: 'Failed to save audit log', error: err.message }); }
});

// DELETE /api/indoor/audit-logs
router.delete('/', async (_req, res) => {
  try { await AuditLog.deleteMany({}); res.json({ message: 'All audit logs deleted' }); }
  catch (err) { res.status(500).json({ message: 'Failed to delete audit logs', error: err.message }); }
});

module.exports = router;
