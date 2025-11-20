"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const appointmentSchema = new mongoose_1.default.Schema({
    patientId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" },
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    patientAge: Number,
    patientGender: String,
    patientAddress: String,
    doctorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Doctor" },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    type: { type: String, required: true },
    reason: String,
    status: { type: String, default: "Pending" },
    sampleTakenAt: Date,
    reportId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Report" },
    sampleId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Sample" }
}, { collection: "appointments", timestamps: true });
// Use distinct model name to avoid collision with Hospital's Appointment model
exports.default = mongoose_1.default.models.LabAppointment ||
    mongoose_1.default.model("LabAppointment", appointmentSchema, "appointments");
