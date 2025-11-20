"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Sample_1 = __importDefault(require("../lab models/Sample"));
const Appointment_1 = __importDefault(require("../lab models/Appointment"));
const router = (0, express_1.Router)();
// Public endpoints (could be secured later)
router.get("/summary", async (_req, res) => {
    try {
        const total = await Sample_1.default.countDocuments();
        const pending = await Sample_1.default.countDocuments({ status: "pending" });
        const completed = await Sample_1.default.countDocuments({ status: "completed" });
        // next appointment
        const nextAppt = await Appointment_1.default.findOne({ date: { $gte: new Date() } }).sort({ date: 1 });
        let nextAppointment = null;
        if (nextAppt) {
            const diffMs = nextAppt.date.getTime() - Date.now();
            nextAppointment = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); // days
        }
        res.json({ total, pending, completed, nextAppointment });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch summary" });
    }
});
// KPI metrics for Lab Admin dashboard
router.get("/kpis", async (_req, res) => {
    try {
        // Map statuses to existing Sample schema: received -> pending, processing -> in progress
        const [pending, inProgress] = await Promise.all([
            Sample_1.default.countDocuments({ status: "received" }),
            Sample_1.default.countDocuments({ status: "processing" })
        ]);
        // Completed today based on updatedAt within start of today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const completedToday = await Sample_1.default.countDocuments({
            status: "completed",
            updatedAt: { $gte: startOfToday }
        });
        // Urgent: any sample with at least one critical result
        const urgent = await Sample_1.default.countDocuments({ "results.isCritical": true });
        res.json({ pending, inProgress, completedToday, urgent });
    }
    catch (err) {
        console.error("/dashboard/kpis error", err);
        res.status(500).json({ message: "Failed to fetch KPIs" });
    }
});
router.get("/recent-tests", async (_req, res) => {
    try {
        const tests = await Sample_1.default.find().sort({ createdAt: -1 }).limit(5);
        res.json(tests);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch tests" });
    }
});
exports.default = router;
