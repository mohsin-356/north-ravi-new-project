import { Schema, model, Document, Types } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  type: "critical" | "warning" | "info" | "success";
  category?: string;
  read: boolean;
  createdAt: Date;
  userRole?: string; // optional role who should see it
  recipientId?: Types.ObjectId; // ref: 'User' (or Patient)
}

const notificationSchema = new Schema<INotification>({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ["critical", "warning", "info", "success"], default: "info" },
  category: String,
  read: { type: Boolean, default: false },
  userRole: String,
  recipientId: { type: Schema.Types.ObjectId, ref: "User", index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default model<INotification>("Notification", notificationSchema);
