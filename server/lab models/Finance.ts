import { Schema, model, Document } from "mongoose";

export interface IFinance extends Document {
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  date: Date;
  reference?: string;
}

const financeSchema = new Schema<IFinance>(
  {
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
      default: "expense"
    },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    reference: { type: String }
  },
  { timestamps: true }
);

const Finance = model<IFinance>("Finance", financeSchema);
export default Finance;
