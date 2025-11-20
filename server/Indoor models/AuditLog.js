const mongoose = require('mongoose');

const IndoorAuditLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userRole: { type: String },
    action: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: String },
    details: { type: String },
    ipAddress: { type: String },
  },
  { versionKey: false, collection: 'indoor_auditlog' }
);

module.exports = mongoose.models.IndoorAuditLog || mongoose.model('IndoorAuditLog', IndoorAuditLogSchema);
