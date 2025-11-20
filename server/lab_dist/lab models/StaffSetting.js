"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const staffSettingSchema = new mongoose_1.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose_1.Schema.Types.Mixed, required: true },
    description: { type: String },
}, { timestamps: true, collection: "lab_staff_settings" });
const StaffSettingModel = mongoose_1.models.LabStaffSetting;
exports.default = StaffSettingModel || (0, mongoose_1.model)("LabStaffSetting", staffSettingSchema, "lab_staff_settings");
