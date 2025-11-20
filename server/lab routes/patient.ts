import { Router, Request, Response } from "express";
import { verifyJWT, authorizeRoles } from "../middleware/auth";
import Report from "../lab models/Report";
import Appointment from "../lab models/Appointment";
import Sample from "../lab models/Sample";

const router = Router();

// Note: Doctor model/routes were removed as per project scope.

// Book an appointment (patient authenticated)
router.post("/appointments", verifyJWT as any, authorizeRoles(["patient"]) as any, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const payload = { ...req.body, patientId: user.uid };
    const appointment = await Appointment.create(payload);
    res.status(201).json(appointment);
    return;
  } catch (err) {
    res.status(400).json({ message: "Failed to book appointment" });
    return;
  }
});

// All other patient routes require authentication
router.use(verifyJWT as any, authorizeRoles(["patient"]) as any);

// Get own appointments
router.get("/appointments", async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const appts = await Appointment.find({ patientId: user.uid }).sort({ date: -1 });
    res.set("Cache-Control", "no-store");
    res.json(appts);
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch appointments" });
    return;
  }
});

// Cancel own appointment
router.put("/appointments/:id/cancel", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    // Only allow cancel if appointment belongs to patient and is not completed
    const appt = await Appointment.findOne({ _id: id, patientId: user.uid });
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
  } catch (err) {
    res.status(400).json({ message: "Failed to cancel appointment" });
    return;
  }
});

// Get own test results
// Deprecated: use /patient/reports
router.get("/results", async (_req: Request, res: Response) => {
  res.status(410).json({ message: "Deprecated. Use /patient/reports" });
  return;
});

// Get completed reports for the authenticated patient
router.get("/reports", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const appts = await Appointment.find({ patientId: user.uid }).select({ _id: 1 });
    const apptIds = appts.map(a => a._id);
    const samples = await Sample.find({ appointmentId: { $in: apptIds }, status: "completed" })
      .populate("tests")
      .sort({ updatedAt: -1 });
    res.json(samples);
    return;
  } catch (err) {
    console.error("Failed to fetch patient reports", err);
    res.status(500).json({ message: "Failed to fetch reports" });
    return;
  }
});

export default router;
