"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const labSchema = new mongoose_1.Schema({
    labName: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: { type: String, required: true },
    license: { type: String, required: true },
});
const pricingSchema = new mongoose_1.Schema({
    defaultCurrency: { type: String, required: true },
    taxRate: { type: Number, required: true },
    discountRate: { type: Number, required: true },
});
// regional and notifications schemas removed
const backupSchema = new mongoose_1.Schema({
    enabled: { type: Boolean, default: false },
    time: { type: String, default: "0 2 * * *" }, // default 2AM
});
const settingSchema = new mongoose_1.Schema({
    lab: { type: labSchema, required: true },
    pricing: { type: pricingSchema, required: true },
    // regional and notifications removed
    backup: { type: backupSchema, required: false },
}, { timestamps: { createdAt: false, updatedAt: true }, collection: "lab_settings" });
exports.default = mongoose_1.models.LabSetting
    || (0, mongoose_1.model)("LabSetting", settingSchema, "lab_settings");
