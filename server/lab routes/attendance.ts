import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import { verifyJWT, authorizeRoles } from "./localAuth";
import Staff from "../lab models/Staff";
import Attendance, { IAttendance } from "../lab models/Attendance";
import { logAudit } from "../lab utils/audit";

const router = Router();
router.use(verifyJWT, authorizeRoles(["labTech", "researcher"]));

// Get daily attendance ?date=YYYY-MM-DD
router.get("/", async (req: Request, res: Response) => {
  const { date } = req.query as { date?: string };
  if (!date) {
    res.status(400).json({ message: "date query param required" });
    return;
  }
  const list = await Attendance.find({ date }).lean();
  const transformed = list.map((rec:any)=>({
    ...rec,
    name: rec.staffName,
    checkIn: rec.checkInTime,
    checkOut: rec.checkOutTime,
  }));
  res.json(transformed);
  return;
});

// Add attendance record
router.post(
  "/",
  [
    body("staffId").notEmpty(),
    body("date").notEmpty(),
    body("status").isIn(["present", "absent", "leave"]),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    // verify staff exists
    const staff = await Staff.findById(req.body.staffId);
    if (!staff) {
      res.status(404).json({ message: "Staff not found" });
      return;
    }
    try {
      const created = await Attendance.create({ ...req.body, staffName: staff.name });
      await logAudit(req as any, "create_attendance", "LabAttendance", {
        id: (created as any)._id,
        staffId: String(req.body.staffId),
        date: req.body.date,
        status: req.body.status,
      });
      res.status(201).json(created);
      return;
    } catch (err:any) {
      if (err.code === 11000) {
        res.status(409).json({ message: "Attendance already exists" });
        return;
      }
      console.error(err);
      res.status(500).json({ message: "Failed to create attendance" });
      return;
    }
  }
);

// Clock-in
router.post(
  "/clock-in",
  [body("staffId").notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { staffId } = req.body as { staffId: string };
    if (!mongoose.isValidObjectId(staffId)) {
      res.status(400).json({ message: "Invalid staffId" });
      return;
    }
    const staff = await Staff.findById(staffId);
    if (!staff) {
      res.status(404).json({ message: "Staff not found" });
      return;
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    // check existing
      const existing = await Attendance.findOne({ staffId, date: today });
      if (existing && existing.checkInTime) {
        res.status(409).json({ message: "Already clocked in" });
        return;
      }
      const rec = await Attendance.findOneAndUpdate(
        { staffId, date: today },
        {
          $set: { status: "present", checkInTime: new Date().toISOString(), staffName: staff.name },
        },
        { upsert: true, new: true }
      ).lean();
      await logAudit(req as any, "clock_in", "LabAttendance", {
        staffId,
        date: today,
        recordId: rec?._id,
        checkIn: rec?.checkInTime,
      });
      res.status(201).json({ ...rec, checkIn: rec?.checkInTime });
      return;
  }
);

// Monthly attendance
router.get("/monthly", async (req:Request, res:Response)=>{
  const { staffId, month } = req.query as { staffId?: string; month?: string }; // month = YYYY-MM
  if(!staffId || !month) {
    res.status(400).json({ message: "staffId and month query params required" });
    return;
  }
  try{
    const list = await Attendance.find({ staffId, date: { $regex: `^${month}` } }).lean();
    const transformed = list.map((rec:any)=>({
      ...rec,
      name: rec.staffName,
      checkIn: rec.checkInTime,
      checkOut: rec.checkOutTime,
    }));
    res.json(transformed);
  }catch(err){
    console.error(err);
    res.status(500).json({ message: "Failed to fetch monthly attendance" });
  }
});

// Clock-out
router.post(
  "/clock-out",
  [body("staffId").notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { staffId } = req.body as { staffId: string };
    const staff = await Staff.findById(staffId);
    if (!staff) {
      res.status(404).json({ message: "Staff not found" });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const existing = await Attendance.findOne({ staffId, date: today });
      if (existing && existing.checkOutTime) {
        res.status(409).json({ message: "Already clocked out" });
        return;
      }
      const rec = await Attendance.findOneAndUpdate(
        { staffId, date: today },
        {
          $set: { checkOutTime: new Date().toISOString(), staffName: staff.name },
          $setOnInsert: { status: "present" },
        },
        { upsert: true, new: true }
      ).lean();
      await logAudit(req as any, "clock_out", "LabAttendance", {
        staffId,
        date: today,
        recordId: rec?._id,
        checkOut: rec?.checkOutTime,
      });
      res.status(201).json({ ...rec, checkOut: rec?.checkOutTime });
      return;
  }
);

export default router;
