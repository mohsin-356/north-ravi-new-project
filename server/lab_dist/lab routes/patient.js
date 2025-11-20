"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const Appointment_1 = __importDefault(require("../lab models/Appointment"));
const Sample_1 = __importDefault(require("../lab models/Sample"));
const router = (0, express_1.Router)();
// Note: Doctor model/routes were removed as per project scope.
// Book an appointment (patient authenticated)
router.post("/appointments", auth_1.verifyJWT, (0, auth_1.authorizeRoles)(["patient"]), async (req, res) => {
    try {
        const user = req.user;
        const payload = { ...req.body, patientId: user.uid };
        const appointment = await Appointment_1.default.create(payload);
        res.status(201).json(appointment);
        return;
    }
    catch (err) {
        res.status(400).json({ message: "Failed to book appointment" });
        return;
    }
});
// All other patient routes require authentication
router.use(auth_1.verifyJWT, (0, auth_1.authorizeRoles)(["patient"]));
// Get own appointments
router.get("/appointments", async (req, res) => {
    const user = req.user;
    try {
        const appts = await Appointment_1.default.find({ patientId: user.uid }).sort({ date: -1 });
        res.set("Cache-Control", "no-store");
        res.json(appts);
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch appointments" });
        return;
    }
});
// Cancel own appointment
router.put("/appointments/:id/cancel", async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        // Only allow cancel if appointment belongs to patient and is not completed
        const appt = await Appointment_1.default.findOne({ _id: id, patientId: user.uid });
        if (!appt) {
            res.status(404).json({ message: "Appointment not found" });
            return;
        }
        if (["Completed", "In-Progress"].includes(appt.status)) {
            res.status(400).json({ message: "Cannot cancel this appointment" });
            return;
        }
        appt.status = "Cancelled";
        await appt.save();
        res.json(appt);
        return;
    }
    catch (err) {
        res.status(400).json({ message: "Failed to cancel appointment" });
        return;
    }
});
// Get own test results
// Deprecated: use /patient/reports
router.get("/results", async (_req, res) => {
    res.status(410).json({ message: "Deprecated. Use /patient/reports" });
    return;
});
// Get completed reports for the authenticated patient
router.get("/reports", async (req, res) => {
    try {
        const user = req.user;
        const appts = await Appointment_1.default.find({ patientId: user.uid }).select({ _id: 1 });
        const apptIds = appts.map(a => a._id);
        const samples = await Sample_1.default.find({ appointmentId: { $in: apptIds }, status: "completed" })
            .populate("tests")
            .sort({ updatedAt: -1 });
        res.json(samples);
        return;
    }
    catch (err) {
        console.error("Failed to fetch patient reports", err);
        res.status(500).json({ message: "Failed to fetch reports" });
        return;
    }
});
exports.default = router;
