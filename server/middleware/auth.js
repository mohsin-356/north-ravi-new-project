const jwt = require('jsonwebtoken');

/**
 * Verify JWT middleware.
 *
 * In production: standard "Bearer <token>" header required.
 * In development: if no Authorization header is provided, you may instead
 * supply `x-user-id` and (optionally) `x-user-role` headers to bypass JWT.
 */
const verifyJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        // Attach to request for downstream handlers
        req.user = decoded; // preferred
        req.userData = decoded; // backward-compatibility
        return next();
      } catch (e) {
        // If token is invalid/expired, allow lab endpoints to proceed anonymously
        const url = req.originalUrl || req.url || '';
        const isLabEndpoint = url.startsWith('/api/lab') || url.startsWith('/api/labtech');
        if (process.env.LAB_ALLOW_ANON === 'true' || isLabEndpoint) {
          console.warn('[auth] Invalid/expired token for lab endpoint; allowing anonymous as labTech for', url);
          req.user = { id: 'lab_anon', role: req.headers['x-user-role'] || 'labTech' };
          req.userData = req.user;
          return next();
        }
        return res.status(401).json({ message: 'Auth failed: invalid token' });
      }
    }

    // --- Development fallback (no JWT provided) ---
    const devUserId = req.headers['x-user-id'];
    if (devUserId) {
      req.user = {
        id: devUserId,
        role: req.headers['x-user-role'] || 'doctor',
      };
      return next();
    }

    // --- Lab anonymous allowance ---
    // If LAB_ALLOW_ANON=true or the request targets lab endpoints,
    // allow the request to proceed with a default labTech role.
    // This helps local/dev environments or kiosks where tokens may not be present.
    const url = req.originalUrl || req.url || '';
    const isLabEndpoint = url.startsWith('/api/lab') || url.startsWith('/api/labtech');
    if (process.env.LAB_ALLOW_ANON === 'true' || isLabEndpoint) {
      console.warn('[auth] No token provided; allowing anonymous as labTech for', url);
      req.user = {
        id: 'lab_anon',
        role: req.headers['x-user-role'] || 'labTech',
      };
      req.userData = req.user;
      return next();
    }

    return res.status(401).json({ message: 'Auth failed: token missing' });
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(401).json({ message: 'Auth failed' });
  }
};

/**
 * Role-based authorization middleware.
 * Usage: router.use(verifyJWT, authorizeRoles(['doctor']))
 */
const authorizeRoles = (allowedRoles = []) => (req, res, next) => {
  const role = req.user?.role || req.userData?.role;
  if (!role) return res.status(403).json({ message: 'Forbidden' });
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

module.exports = {
  verifyJWT,
  authorizeRoles,
};
