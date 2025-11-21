import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { verifyJWT, authorizeRoles } from "./localAuth";
import Staff from "../lab models/Staff";
import Attendance from "../lab models/Attendance";
import { logAudit } from "../lab utils/audit";

const router = Router();

// Protect all routes; adjust role as needed (e.g., admin or labTech)
router.use(verifyJWT, authorizeRoles(["labTech"]));

// ---------------- Staff CRUD ----------------

// List staff with attendance records
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [staffDocs, attendanceDocs] = await Promise.all([
      Staff.find().lean(),
      Attendance.find().lean(),
    ]);
    const attendanceByStaff: Record<string, any[]> = {};
    attendanceDocs.forEach((rec:any)=>{
      const key = String(rec.staffId);
      if (!attendanceByStaff[key]) attendanceByStaff[key] = [];
      attendanceByStaff[key].push({
        ...rec,
        checkIn: rec.checkInTime,
        checkOut: rec.checkOutTime,
      });
    });
    const staff = staffDocs.map((s:any)=> ({
      ...s,
      attendance: attendanceByStaff[String(s._id)] || [],
    }));
    res.json(staff);
  } catch(err){
    console.error(err);
    res.status(500).json({ message: "Failed to list staff" });
  }
});

// Create staff
router.post(
  "/",
  [body("name").notEmpty(), body("position").notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const created = await Staff.create(req.body);
      await logAudit(req as any, "create_staff", "LabStaff", {
        id: (created as any)._id,
        name: (created as any).name,
        position: (created as any).position,
      });
      res.status(201).json(created);
      return;
    } catch (err) {
      console.error("Staff create error", err);
      res.status(500).json({ message: "Failed to create staff" });
      return;
    }
  }
);

// Update staff
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const updated = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      res.status(404).json({ message: "Staff not found" });
      return;
    }
    await logAudit(req as any, "update_staff", "LabStaff", {
      id: (updated as any)._id,
      name: (updated as any).name,
      position: (updated as any).position,
    });
    res.json(updated);
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to update staff" });
    return;
  }
});

// Delete staff
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const removed = await Staff.findByIdAndDelete(req.params.id);
    if (!removed) {
      res.status(404).json({ message: "Staff not found" });
      return;
    }
    await logAudit(req as any, "delete_staff", "LabStaff", {
      id: (removed as any)._id,
      name: (removed as any).name,
      position: (removed as any).position,
    });
    res.json({});
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to delete staff" });
    return;
  }
});

export default router;
