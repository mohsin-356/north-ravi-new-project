"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const inventoryItemSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    category: { type: mongoose_1.Schema.Types.ObjectId, ref: "Category", required: true },
    currentStock: { type: Number, required: true },
    minThreshold: { type: Number, required: true },
    maxCapacity: { type: Number, required: true },
    unit: { type: String, required: true },
    costPerUnit: { type: Number, required: true },
    // Pack-based fields (optional; when provided, currentStock and costPerUnit should reflect these)
    packs: { type: Number },
    itemsPerPack: { type: Number },
    buyPricePerPack: { type: Number },
    salePricePerPack: { type: Number },
    salePricePerUnit: { type: Number },
    supplier: { type: String, required: true },
    location: { type: String, required: true },
    invoiceNumber: { type: String },
    expiryDate: Date,
    lastRestocked: { type: Date, default: Date.now },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("InventoryItem", inventoryItemSchema);
