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
        const rawLimit = parseInt(String(req.query.limit || 50), 10) || 50;
        const rawSkip = parseInt(String(req.query.skip || 0), 10) || 0;
        const limit = Math.min(Math.max(rawLimit, 1), 500);
        const skip = Math.max(rawSkip, 0);
        const search = req.query.search || "";
        const action = req.query.action || "";
        const from = req.query.from || ""; // yyyy-mm-dd
        const to = req.query.to || ""; // yyyy-mm-dd
        const filter = {};
        if (action && action !== "all") {
            // match exact or prefix to support values like create_user, update_sample, etc.
            filter.action = { $regex: new RegExp("^" + action, "i") };
        }
        if (from || to) {
            filter.createdAt = {};
            if (from)
                filter.createdAt.$gte = new Date(`${from}T00:00:00`);
            if (to)
                filter.createdAt.$lte = new Date(`${to}T23:59:59`);
        }
        if (search && search.trim()) {
            const esc = (s) => s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
            const rx = new RegExp(esc(search.trim()), "i");
            filter.$or = [
                { action: rx },
                { entity: rx },
                { user: rx },
            ];
        }
        const [logs, total] = await Promise.all([
            AuditLog_1.default
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog_1.default.countDocuments(filter),
        ]);
        res.json({ logs, total });
    }
    catch (err) {
        console.error("[lab/audit] list error", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
router.get("/", [
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 500 }),
    (0, express_validator_1.query)("skip").optional().isInt({ min: 0 }),
    (0, express_validator_1.query)("from").optional().isISO8601(),
    (0, express_validator_1.query)("to").optional().isISO8601(),
], listHandler);
exports.default = router;
