"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const financeSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ["income", "expense"],
        required: true,
        default: "expense"
    },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    reference: { type: String }
}, { timestamps: true });
const Finance = (0, mongoose_1.model)("Finance", financeSchema);
exports.default = Finance;
