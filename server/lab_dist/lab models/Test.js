"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const testSchema = new mongoose_1.Schema({
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
exports.default = (0, mongoose_1.model)("Test", testSchema);
