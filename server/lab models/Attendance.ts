import mongoose, { Schema, Document } from "mongoose";

export interface IAttendance extends Document {
  staffId: mongoose.Types.ObjectId;
  staffName?: string;
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "leave";
  checkInTime?: string;
  checkOutTime?: string;
}

const AttendanceSchema: Schema = new Schema<IAttendance>({
  staffId: { type: Schema.Types.ObjectId, ref: "LabStaff", required: true },
  staffName: String,
  date: { type: String, required: true },
  status: { type: String, enum: ["present", "absent", "leave"], required: true },
  checkInTime: String,
  checkOutTime: String,
}, { collection: "lab_attendances" });

AttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

export default (mongoose.models.LabAttendance as mongoose.Model<IAttendance>) ||
  mongoose.model<IAttendance>("LabAttendance", AttendanceSchema, "lab_attendances");
