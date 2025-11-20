import { Schema, model } from "mongoose";

interface IUser {
  username: string;
  passwordHash: string;
  role: "lab-technician" | "labTech" | "receptionist" | "researcher";
  createdAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["lab-technician", "labTech", "receptionist", "researcher"] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Use distinct model name and bind to 'lab_users' collection
export default model<IUser>("LabUser", userSchema, "lab_users");
