"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const notificationSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["critical", "warning", "info", "success"], default: "info" },
    category: String,
    read: { type: Boolean, default: false },
    userRole: String,
    recipientId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
exports.default = (0, mongoose_1.model)("Notification", notificationSchema);
