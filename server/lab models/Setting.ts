import { Schema, model, models, Model, Document } from "mongoose";

export interface ILabSettings {
  labName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  license: string;
}

export interface IPricingSettings {
  defaultCurrency: string;
  taxRate: number;
  discountRate: number;
}

// Removed regional and notifications sections from the model

// Backup settings
export interface IBackupSettings {
  enabled: boolean; // daily automatic backup
  time: string; // cron expression e.g. "0 2 * * *" for 2AM
}

export interface ISetting extends Document {
  lab: ILabSettings;
  pricing: IPricingSettings;
  backup?: IBackupSettings;
  updatedAt?: Date;
}

const labSchema = new Schema<ILabSettings>({
  labName: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  website: { type: String, required: true },
  license: { type: String, required: true },
});

const pricingSchema = new Schema<IPricingSettings>({
  defaultCurrency: { type: String, required: true },
  taxRate: { type: Number, required: true },
  discountRate: { type: Number, required: true },
});

// regional and notifications schemas removed

const backupSchema = new Schema<IBackupSettings>({
  enabled: { type: Boolean, default: false },
  time: { type: String, default: "0 2 * * *" }, // default 2AM
});

const settingSchema = new Schema<ISetting>(
  {
    lab: { type: labSchema, required: true },
    pricing: { type: pricingSchema, required: true },
    // regional and notifications removed
    backup: { type: backupSchema, required: false },
  },
  { timestamps: { createdAt: false, updatedAt: true }, collection: "lab_settings" }
);

export default (models.LabSetting as Model<ISetting>)
  || model<ISetting>("LabSetting", settingSchema, "lab_settings");
