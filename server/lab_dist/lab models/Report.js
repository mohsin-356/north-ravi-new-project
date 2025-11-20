"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const reportSchema = new mongoose_1.Schema({
    patientName: { type: String, required: true },
    testName: { type: String, required: true },
    doctorName: String,
    sampleId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Sample" },
    status: { type: String, enum: ["draft", "approved", "sent"], default: "draft" },
    hasAbnormalValues: { type: Boolean, default: false },
    hasCriticalValues: { type: Boolean, default: false },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Report", reportSchema);
