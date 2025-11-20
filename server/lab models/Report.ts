import { Schema, model, Document, Types } from "mongoose";

export interface IReport extends Document {
  patientName: string;
  testName: string;
  doctorName?: string;
  sampleId?: Types.ObjectId;
  status: "draft" | "approved" | "sent";
  hasAbnormalValues?: boolean;
  hasCriticalValues?: boolean;
}

const reportSchema = new Schema<IReport>(
  {
    patientName: { type: String, required: true },
    testName: { type: String, required: true },
    doctorName: String,
    sampleId: { type: Schema.Types.ObjectId, ref: "Sample" },
    status: { type: String, enum: ["draft", "approved", "sent"], default: "draft" },
    hasAbnormalValues: { type: Boolean, default: false },
    hasCriticalValues: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model<IReport>("Report", reportSchema);
