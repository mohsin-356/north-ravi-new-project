import mongoose, { Document } from "mongoose";

export interface IAppointment extends Document {
  patientId?: mongoose.Types.ObjectId;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientGender?: string;
  patientAddress?: string;
  doctorId: mongoose.Types.ObjectId;
  date: Date;
  time: string;
  type: string;
  reason?: string;
  status: string;
  sampleTakenAt?: Date;
  reportId?: mongoose.Types.ObjectId;
  sampleId?: mongoose.Types.ObjectId;
}

const appointmentSchema = new mongoose.Schema<IAppointment>(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    patientAge: Number,
    patientGender: String,
    patientAddress: String,
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    type: { type: String, required: true },
    reason: String,
    status: { type: String, default: "Pending" },
    sampleTakenAt: Date,
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
    sampleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sample" }
  },
  { collection: "appointments", timestamps: true }
);

// Use distinct model name to avoid collision with Hospital's Appointment model
export default (mongoose.models.LabAppointment as mongoose.Model<IAppointment>) ||
  mongoose.model<IAppointment>("LabAppointment", appointmentSchema, "appointments");
