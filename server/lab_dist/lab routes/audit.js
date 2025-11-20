"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const AuditLog_1 = __importDefault(require("../lab models/AuditLog"));
const router = (0, express_1.Router)();
const listHandler = async (req, res) => {
    try {
        const limit = Math.min(parseInt(String(req.query.limit || 50), 10) || 50, 500);
        const logs = await AuditLog_1.default.find({}).sort({ createdAt: -1 }).limit(limit).lean();
        res.json({ logs });
    }
    catch (err) {
        console.error("[lab/audit] list error", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
router.get("/", [(0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 500 })], listHandler);
exports.default = router;
