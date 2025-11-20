import mongoose, { Schema, Document } from "mongoose";

export interface IStaff extends Document {
  name: string;
  position: string;
  phone?: string;
  email?: string;
  address?: string;
  salary?: number;
  joinDate?: Date;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema: Schema = new Schema<IStaff>(
  {
    name: { type: String, required: true, trim: true },
    position: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    salary: { type: Number },
    joinDate: { type: Date },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true, collection: "lab_staff" }
);

export default (mongoose.models.LabStaff as mongoose.Model<IStaff>) ||
  mongoose.model<IStaff>("LabStaff", StaffSchema, "lab_staff");
