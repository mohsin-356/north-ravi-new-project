"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const localAuth_1 = require("./localAuth");
const Staff_1 = __importDefault(require("../lab models/Staff"));
const Attendance_1 = __importDefault(require("../lab models/Attendance"));
const router = (0, express_1.Router)();
// Protect all routes; adjust role as needed (e.g., admin or labTech)
router.use(localAuth_1.verifyJWT, (0, localAuth_1.authorizeRoles)(["labTech"]));
// ---------------- Staff CRUD ----------------
// List staff with attendance records
router.get("/", async (_req, res) => {
    try {
        const [staffDocs, attendanceDocs] = await Promise.all([
            Staff_1.default.find().lean(),
            Attendance_1.default.find().lean(),
        ]);
        const attendanceByStaff = {};
        attendanceDocs.forEach((rec) => {
            const key = String(rec.staffId);
            if (!attendanceByStaff[key])
                attendanceByStaff[key] = [];
            attendanceByStaff[key].push({
                ...rec,
                checkIn: rec.checkInTime,
                checkOut: rec.checkOutTime,
            });
        });
        const staff = staffDocs.map((s) => ({
            ...s,
            attendance: attendanceByStaff[String(s._id)] || [],
        }));
        res.json(staff);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to list staff" });
    }
});
// Create staff
router.post("/", [(0, express_validator_1.body)("name").notEmpty(), (0, express_validator_1.body)("position").notEmpty()], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const created = await Staff_1.default.create(req.body);
        res.status(201).json(created);
        return;
    }
    catch (err) {
        console.error("Staff create error", err);
        res.status(500).json({ message: "Failed to create staff" });
        return;
    }
});
// Update staff
router.put("/:id", async (req, res) => {
    try {
        const updated = await Staff_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) {
            res.status(404).json({ message: "Staff not found" });
            return;
        }
        res.json(updated);
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Failed to update staff" });
        return;
    }
});
// Delete staff
router.delete("/:id", async (req, res) => {
    try {
        const removed = await Staff_1.default.findByIdAndDelete(req.params.id);
        if (!removed) {
            res.status(404).json({ message: "Staff not found" });
            return;
        }
        res.json({});
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Failed to delete staff" });
        return;
    }
});
exports.default = router;
