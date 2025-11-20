const AuditLog = require('../Indoor models/AuditLog');

async function logAudit(req, { action, entityType, entityId, details }) {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) || req.headers['x-user-id'] || 'unknown';
    const userName = (req.user && (req.user.username || req.user.name)) || req.headers['x-user-name'] || 'system';
    const userRole = (req.user && req.user.role) || req.headers['x-user-role'] || '';
    const ip = req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress) || '';
    await AuditLog.create({
      timestamp: new Date(),
      userId: String(userId),
      userName: String(userName),
      userRole: String(userRole||''),
      action: String(action || 'ACTION'),
      entityType: String(entityType || ''),
      entityId: entityId ? String(entityId) : '',
      details: String(details || ''),
      ipAddress: String(ip || '')
    });
  } catch (e) {
    // swallow audit errors
    try { console.warn('[indoor-audit] failed to log:', e && e.message ? e.message : e); } catch {}
  }
}

module.exports = { logAudit };
