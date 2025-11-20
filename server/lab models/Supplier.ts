import { Schema, model, models, Document } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

const supplierSchema = new Schema<ISupplier>({
  name: { type: String, required: true, trim: true },
  phone: String,
  email: String,
  address: String,
  notes: String,
}, { timestamps: true });

export default (models.Supplier as any) || model<ISupplier>("Supplier", supplierSchema);
