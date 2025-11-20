const AuditLog = require('../Pharmacy  models/AuditLog');

// Audit logging middleware: infers action based on HTTP method and /api/<entity> path. Handles LOGIN/LOGOUT explicitly.
// Map entity path to action prefixes
const entityAction = {
  inventory: 'INVENTORY',
  medicines: 'MEDICINE',
  suppliers: 'SUPPLIER',
  customers: 'CUSTOMER',
  expenses: 'EXPENSE',
  users: 'USER',
  'add-stock': 'INVENTORY',
};

module.exports = (req, res, next) => {
  // Special-case login/logout endpoints
  if (req.method === 'POST' && (/^\/api\/login/.test(req.originalUrl))) {
    return logAndNext('LOGIN');
  }
  if (req.method === 'POST' && (/^\/api\/logout/.test(req.originalUrl))) {
    return logAndNext('LOGOUT');
  }

  const segments = req.originalUrl.split('?')[0].split('/').filter(Boolean);
  if (segments.length < 2) return next();
  const entity = segments[1]; // e.g. '/api/medicines' => 'medicines'
  const base = entityAction[entity];
  if (!base) return next();

  function logAndNext(actionOverride) {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const user = req.user || {};
          await AuditLog.create({
            userId: user.id || 'unknown',
            userName: user.username || 'unknown',
            userRole: user.role || 'unknown',
            action: actionOverride,
            details: `${actionOverride} via ${req.method} ${req.originalUrl}`,
            ipAddress: req.ip,
          });
        } catch (err) {
          console.error('Audit middleware error', err.message);
        }
      }
    });
    return next();
  }

  let actionPrefix = '';
  if (req.method === 'POST') {
    actionPrefix = entity === 'expenses' ? 'ADD' : 'ADD';
  } else if (req.method === 'PUT' || req.method === 'PATCH') {
    actionPrefix = 'EDIT';
  } else if (req.method === 'DELETE') {
    actionPrefix = 'DELETE';
  } else {
    return next();
  }
  const action = `${actionPrefix}_${base}`;

  // postpone logging until response successful
  res.on('finish', async () => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      try {
        let user = req.user || {}; // assuming auth middleware sets req.user

        // For user creation, the user is not yet in the request.
        // We log it as a system action, as there is no authenticated user.
        if (action === 'ADD_USER') {
          user = {
            id: 'system',
            username: 'system',
            role: 'system',
          };
        }

        await AuditLog.create({
          userId: user.id || 'unknown',
          userName: user.username || 'unknown',
          userRole: user.role || 'unknown',
          action,
          entityType: entity,
          entityId: req.params.id || undefined,
          details: `${action} via ${req.method} ${req.originalUrl}`,
          ipAddress: req.ip,
        });
      } catch (err) {
        console.error('Audit middleware error', err.message);
      }
    }
  });

  next();
};
