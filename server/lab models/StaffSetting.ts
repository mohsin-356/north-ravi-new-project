import { Schema, model, models, Document } from "mongoose";

export interface IStaffSetting extends Document {
  key: string; // e.g. "attendance"
  value: unknown; // arbitrary JSON object
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const staffSettingSchema = new Schema<IStaffSetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
  },
  { timestamps: true, collection: "lab_staff_settings" }
);

// Use a safe cast for existing model when hot-reloading/compiling
type MongooseModel<T> = import('mongoose').Model<T>;
const StaffSettingModel = (models.LabStaffSetting as unknown) as MongooseModel<IStaffSetting> | undefined;
export default StaffSettingModel || model<IStaffSetting>("LabStaffSetting", staffSettingSchema, "lab_staff_settings");
