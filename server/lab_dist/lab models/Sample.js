"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const sampleSchema = new mongoose_1.Schema({
    patientName: { type: String, required: true },
    phone: { type: String, required: true },
    age: String,
    gender: String,
    address: String,
    guardianRelation: String,
    guardianName: String,
    cnic: String,
    preferredDate: Date,
    preferredTime: String,
    appointmentType: String,
    reasonForVisit: String,
    tests: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Test", required: true }],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    netAmount: { type: Number },
    status: { type: String, enum: ["received", "processing", "completed"], default: "received" },
    appointmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Appointment" },
    results: [
        {
            parameterId: { type: String },
            value: { type: Number, required: false, default: null },
            comment: String,
            isAbnormal: Boolean,
            isCritical: Boolean,
            label: String,
            unit: String,
            normalText: String,
        },
    ],
    interpretation: String,
    sampleNumber: { type: Number, index: true },
    token: { type: String, index: true },
    consumables: [
        {
            item: { type: mongoose_1.Schema.Types.ObjectId, ref: "InventoryItem", required: true },
            quantity: { type: Number, required: true, min: 1 },
        },
    ],
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Sample", sampleSchema);
