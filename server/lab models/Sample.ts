import { Schema, model, Document, Types } from "mongoose";

export interface ISample extends Document {
  patientName: string;
  preferredDate?: Date;
  preferredTime?: string;
  appointmentType?: string;
  reasonForVisit?: string;
  phone: string;
  age?: string;
  gender?: string;
  address?: string;
  guardianRelation?: string; // e.g., S/O, D/O
  guardianName?: string;
  cnic?: string;
  tests: Types.ObjectId[]; // references Test
  totalAmount: number;
  discount?: number;
  netAmount?: number;
  status: "received" | "processing" | "completed";
  appointmentId?: Types.ObjectId;
  results?: {
    parameterId?: string; // optional for manual rows
    value?: number | null; // allow null for not-entered values
    comment?: string;
    isAbnormal?: boolean;
    isCritical?: boolean;
    // manual row support
    label?: string;
    unit?: string;
    normalText?: string;
  }[];
  interpretation?: string;
  sampleNumber?: number; // auto-incremented sequence
  token?: string; // e.g., ddMMyyyy_1 daily token number
  consumables?: { item: Types.ObjectId; quantity: number }[];
}

const sampleSchema = new Schema<ISample>(
  {
    patientName: { type: String, required: true },
    phone: { type: String, required: true },
    age: String,
    gender: String,
    address: String,
    guardianRelation: String,
    guardianName: String,
    cnic: String,
    preferredDate: Date,
    preferredTime: String,
    appointmentType: String,
    reasonForVisit: String,
    tests: [{ type: Schema.Types.ObjectId, ref: "Test", required: true }],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    netAmount: { type: Number },
    status: { type: String, enum: ["received", "processing", "completed"], default: "received" },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    results: [
      {
        parameterId: { type: String },
        value: { type: Number, required: false, default: null },
        comment: String,
        isAbnormal: Boolean,
        isCritical: Boolean,
        label: String,
        unit: String,
        normalText: String,
      },
    ],
    interpretation: String,
    sampleNumber: { type: Number, index: true },
    token: { type: String, index: true },
    consumables: [
      {
        item: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
  },
  { timestamps: true }
);

export default model<ISample>("Sample", sampleSchema);
