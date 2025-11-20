"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const mongoose_1 = __importDefault(require("mongoose"));
const localAuth_1 = require("./localAuth");
const Staff_1 = __importDefault(require("../lab models/Staff"));
const Attendance_1 = __importDefault(require("../lab models/Attendance"));
const router = (0, express_1.Router)();
router.use(localAuth_1.verifyJWT, (0, localAuth_1.authorizeRoles)(["labTech", "researcher"]));
// Get daily attendance ?date=YYYY-MM-DD
router.get("/", async (req, res) => {
    const { date } = req.query;
    if (!date) {
        res.status(400).json({ message: "date query param required" });
        return;
    }
    const list = await Attendance_1.default.find({ date }).lean();
    const transformed = list.map((rec) => ({
        ...rec,
        name: rec.staffName,
        checkIn: rec.checkInTime,
        checkOut: rec.checkOutTime,
    }));
    res.json(transformed);
    return;
});
// Add attendance record
router.post("/", [
    (0, express_validator_1.body)("staffId").notEmpty(),
    (0, express_validator_1.body)("date").notEmpty(),
    (0, express_validator_1.body)("status").isIn(["present", "absent", "leave"]),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    // verify staff exists
    const staff = await Staff_1.default.findById(req.body.staffId);
    if (!staff) {
        res.status(404).json({ message: "Staff not found" });
        return;
    }
    try {
        const created = await Attendance_1.default.create({ ...req.body, staffName: staff.name });
        res.status(201).json(created);
        return;
    }
    catch (err) {
        if (err.code === 11000) {
            res.status(409).json({ message: "Attendance already exists" });
            return;
        }
        console.error(err);
        res.status(500).json({ message: "Failed to create attendance" });
        return;
    }
});
// Clock-in
router.post("/clock-in", [(0, express_validator_1.body)("staffId").notEmpty()], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { staffId } = req.body;
    if (!mongoose_1.default.isValidObjectId(staffId)) {
        res.status(400).json({ message: "Invalid staffId" });
        return;
    }
    const staff = await Staff_1.default.findById(staffId);
    if (!staff) {
        res.status(404).json({ message: "Staff not found" });
        return;
    }
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    // check existing
    const existing = await Attendance_1.default.findOne({ staffId, date: today });
    if (existing && existing.checkInTime) {
        res.status(409).json({ message: "Already clocked in" });
        return;
    }
    const rec = await Attendance_1.default.findOneAndUpdate({ staffId, date: today }, {
        $set: { status: "present", checkInTime: new Date().toISOString(), staffName: staff.name },
    }, { upsert: true, new: true }).lean();
    res.status(201).json({ ...rec, checkIn: rec === null || rec === void 0 ? void 0 : rec.checkInTime });
    return;
});
// Monthly attendance
router.get("/monthly", async (req, res) => {
    const { staffId, month } = req.query; // month = YYYY-MM
    if (!staffId || !month) {
        res.status(400).json({ message: "staffId and month query params required" });
        return;
    }
    try {
        const list = await Attendance_1.default.find({ staffId, date: { $regex: `^${month}` } }).lean();
        const transformed = list.map((rec) => ({
            ...rec,
            name: rec.staffName,
            checkIn: rec.checkInTime,
            checkOut: rec.checkOutTime,
        }));
        res.json(transformed);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch monthly attendance" });
    }
});
// Clock-out
router.post("/clock-out", [(0, express_validator_1.body)("staffId").notEmpty()], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { staffId } = req.body;
    const staff = await Staff_1.default.findById(staffId);
    if (!staff) {
        res.status(404).json({ message: "Staff not found" });
        return;
    }
    const today = new Date().toISOString().split("T")[0];
    const existing = await Attendance_1.default.findOne({ staffId, date: today });
    if (existing && existing.checkOutTime) {
        res.status(409).json({ message: "Already clocked out" });
        return;
    }
    const rec = await Attendance_1.default.findOneAndUpdate({ staffId, date: today }, {
        $set: { checkOutTime: new Date().toISOString(), staffName: staff.name },
        $setOnInsert: { status: "present" },
    }, { upsert: true, new: true }).lean();
    res.status(201).json({ ...rec, checkOut: rec === null || rec === void 0 ? void 0 : rec.checkOutTime });
    return;
});
exports.default = router;
