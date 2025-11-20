"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const reportTemplateSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    html: String,
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("ReportTemplate", reportTemplateSchema);
