import { Schema, model } from "mongoose";

interface IAuditLog {
  action: string; // e.g. create_user, delete_user
  entity: string; // e.g. LabUser
  user?: string;  // actor username or id
  details?: any;
  createdAt?: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    entity: { type: String, required: true },
    user: { type: String },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default model<IAuditLog>("LabAuditLog", auditLogSchema, "lab_audit_logs");
