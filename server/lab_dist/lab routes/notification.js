"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Notification_1 = __importDefault(require("../lab models/Notification"));
const audit_1 = require("../lab utils/audit");
const router = (0, express_1.Router)();
// Auth disabled for notifications: open access
// GET /notification - list notifications, latest first
router.get("/", async (req, res) => {
    try {
        const { unread } = req.query;
        const q = req.query.q || "";
        const page = req.query.page != null ? Math.max(1, parseInt(String(req.query.page || '1'), 10)) : null;
        const limit = req.query.limit != null ? Math.min(200, Math.max(1, parseInt(String(req.query.limit || '20'), 10))) : null;
        const hasPaging = page != null || limit != null || !!q || typeof unread !== 'undefined';
        const filter = {};
        if (String(unread).toLowerCase() === 'true')
            filter.read = false;
        if (q && q.trim()) {
            const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const rx = new RegExp(esc(q.trim()), 'i');
            filter.$or = [{ title: rx }, { message: rx }, { category: rx }, { type: rx }];
        }
        if (!hasPaging) {
            const lim = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
            const docs = await Notification_1.default.find(filter).sort({ createdAt: -1 }).limit(Number(lim));
            res.json(docs);
            return;
        }
        const p = page !== null && page !== void 0 ? page : 1;
        const l = limit !== null && limit !== void 0 ? limit : 20;
        const skip = (p - 1) * l;
        const [items, total] = await Promise.all([
            Notification_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l),
            Notification_1.default.countDocuments(filter),
        ]);
        res.json({ data: items, page: p, limit: l, total, totalPages: Math.max(1, Math.ceil(total / l)) });
        return;
    }
    catch (err) {
        console.error("Failed to fetch notifications", err);
        res.status(500).json({ message: "Failed to fetch notifications" });
        return;
    }
});
// PATCH /notification/:id/read - mark as read
router.patch("/:id/read", async (req, res) => {
    try {
        const notif = await Notification_1.default.findById(req.params.id);
        if (!notif) {
            res.status(404).json({ message: "Notification not found" });
            return;
        }
        notif.read = true;
        await notif.save();
        try {
            await (0, audit_1.logAudit)(req, "read_notification", "LabNotification", {
                id: notif._id,
                title: notif.title,
            });
        }
        catch { }
        res.json(notif);
        return;
    }
    catch {
        res.status(500).json({ message: "Failed to update notification" });
        return;
    }
});
exports.default = router;
