const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    module: { type: String, index: true },
    details: { type: mongoose.Schema.Types.Mixed },
    userId: { type: String, index: true },
    username: { type: String },
    role: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { minimize: false }
);

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
