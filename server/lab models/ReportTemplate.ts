import { Schema, model, Document } from "mongoose";

export interface IReportTemplate extends Document {
  title: string;
  description: string;
  html?: string; // stored HTML/markdown for the template body
}

const reportTemplateSchema = new Schema<IReportTemplate>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    html: String,
  },
  { timestamps: true }
);

export default model<IReportTemplate>("ReportTemplate", reportTemplateSchema);
