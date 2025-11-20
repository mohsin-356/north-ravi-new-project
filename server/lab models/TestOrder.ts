import mongoose, { Document } from "mongoose";

export interface ITestOrder extends Document {
  appointmentId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  testList: mongoose.Types.ObjectId[]; // references Test collection
  status: "awaiting-sample" | "in-analysis" | "completed";
}

const testOrderSchema = new mongoose.Schema<ITestOrder>(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    testList: [{ type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true }],
    status: { type: String, enum: ["awaiting-sample", "in-analysis", "completed"], default: "awaiting-sample" }
  },
  { collection: "testorders", timestamps: true }
);

testOrderSchema.index({ doctorId: 1 });

// Use deleteOne document middleware instead of deprecated remove
// eslint-disable-next-line @typescript-eslint/ban-types
// @ts-ignore – mongoose typings accept this overload when options provided
// We add options to clarify this is document middleware
// (see https://mongoosejs.com/docs/middleware.html)
testOrderSchema.pre("deleteOne", { document: true, query: false }, function (next) {
  // TODO: cascade deletes if needed (e.g., samples, reports)
  next();
});

export default (mongoose.models.TestOrder as mongoose.Model<ITestOrder>) ||
  mongoose.model<ITestOrder>("TestOrder", testOrderSchema);
