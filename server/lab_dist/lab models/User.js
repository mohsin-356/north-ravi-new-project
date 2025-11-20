"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["lab-technician", "labTech", "receptionist", "researcher"] },
}, { timestamps: { createdAt: true, updatedAt: false } });
// Use distinct model name and bind to 'lab_users' collection
exports.default = (0, mongoose_1.model)("LabUser", userSchema, "lab_users");
