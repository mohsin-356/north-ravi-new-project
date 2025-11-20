import { Schema, model, Document, Types } from "mongoose";
import { ICategory } from "./Category";

export interface IInventoryItem extends Document {
  name: string;
  category: Types.ObjectId | ICategory;
  currentStock: number;
  minThreshold: number;
  maxCapacity: number;
  unit: string;
  costPerUnit: number;
  // Pack-based fields
  packs?: number; // number of packs
  itemsPerPack?: number; // items per pack (packQuantity)
  buyPricePerPack?: number; // purchase price per pack
  salePricePerPack?: number; // optional sale price per pack
  salePricePerUnit?: number; // derived sale price per unit
  supplier: string;
  location: string;
  invoiceNumber?: string;
  expiryDate?: Date;
  lastRestocked: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    currentStock: { type: Number, required: true },
    minThreshold: { type: Number, required: true },
    maxCapacity: { type: Number, required: true },
    unit: { type: String, required: true },
    costPerUnit: { type: Number, required: true },
    // Pack-based fields (optional; when provided, currentStock and costPerUnit should reflect these)
    packs: { type: Number },
    itemsPerPack: { type: Number },
    buyPricePerPack: { type: Number },
    salePricePerPack: { type: Number },
    salePricePerUnit: { type: Number },
    supplier: { type: String, required: true },
    location: { type: String, required: true },
    invoiceNumber: { type: String },
    expiryDate: Date,
    lastRestocked: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default model<IInventoryItem>("InventoryItem", inventoryItemSchema);
