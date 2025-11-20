import { Schema, model, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export default model<ICategory>("Category", categorySchema);
