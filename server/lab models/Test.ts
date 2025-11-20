import { Schema, model, Document } from "mongoose";

export interface ITest extends Document {
  name: string;
  category: string;
  description: string;

  price: number; // currency value
  sampleType: "blood" | "urine" | "other";

  fastingRequired?: boolean;
  parameters?: {
    id: string;
    name: string;
    unit: string;
    normalRange: { min: number; max: number };
    // Optional textual normal ranges per group (e.g., "4 - 11", "150-400")
    normalRangeMale?: string | null;
    normalRangeFemale?: string | null;
    normalRangePediatric?: string | null;
    criticalRange?: { min: number; max: number };
  }[];
}

const testSchema = new Schema<ITest>({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },

  price: { type: Number, required: true },
  sampleType: { type: String, default: "blood" },

  fastingRequired: { type: Boolean, default: false },
  parameters: [
    {
      id: String,
      name: String,
      unit: String,
      normalRangeMale: { type: String, default: null },
      normalRangeFemale: { type: String, default: null },
      normalRangePediatric: { type: String, default: null },
      normalRange: {
        min: Number,
        max: Number,
      },
      criticalRange: {
        min: Number,
        max: Number,
      },
    },
  ],
}, { timestamps: true });

export default model<ITest>("Test", testSchema);
