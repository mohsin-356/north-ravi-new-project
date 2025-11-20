"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const auditLogSchema = new mongoose_1.Schema({
    action: { type: String, required: true },
    entity: { type: String, required: true },
    user: { type: String },
    details: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });
exports.default = (0, mongoose_1.model)("LabAuditLog", auditLogSchema, "lab_audit_logs");
