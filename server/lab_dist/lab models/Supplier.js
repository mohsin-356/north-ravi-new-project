"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const supplierSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    phone: String,
    email: String,
    address: String,
    notes: String,
}, { timestamps: true });
exports.default = mongoose_1.models.Supplier || (0, mongoose_1.model)("Supplier", supplierSchema);
