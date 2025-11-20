// Compatibility shim for compiled Lab routes
// Some compiled lab route files require('../middleware/auth') relative to lab_dist/lab routes/
// But the actual compiled middleware is emitted under 'lab_dist/lab middleware/auth.js'.
// This shim makes '../middleware/auth' resolvable by re-exporting from the real path.

try {
  module.exports = require('../lab middleware/auth.js');
} catch (e) {
  // Fallback: try without extension in case of different emitter
  try {
    module.exports = require('../lab middleware/auth');
  } catch (err) {
    throw e;
  }
}
