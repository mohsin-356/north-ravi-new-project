import { Router, Request, Response } from "express";
import Sample from "../lab models/Sample";
import Appointment from "../lab models/Appointment";

const router = Router();

// Public endpoints (could be secured later)
router.get("/summary", async (_req: Request, res: Response) => {
  try {
    const total = await Sample.countDocuments();
    const pending = await Sample.countDocuments({ status: "pending" });
    const completed = await Sample.countDocuments({ status: "completed" });

    // next appointment
    const nextAppt = await Appointment.findOne({ date: { $gte: new Date() } }).sort({ date: 1 });
    let nextAppointment: number | null = null;
    if (nextAppt) {
      const diffMs = nextAppt.date.getTime() - Date.now();
      nextAppointment = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); // days
    }

    res.json({ total, pending, completed, nextAppointment });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch summary" });
  }
});

// KPI metrics for Lab Admin dashboard
router.get("/kpis", async (_req: Request, res: Response) => {
  try {
    // Map statuses to existing Sample schema: received -> pending, processing -> in progress
    const [pending, inProgress] = await Promise.all([
      Sample.countDocuments({ status: "received" }),
      Sample.countDocuments({ status: "processing" })
    ]);

    // Completed today based on updatedAt within start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const completedToday = await Sample.countDocuments({
      status: "completed",
      updatedAt: { $gte: startOfToday }
    });

    // Urgent: any sample with at least one critical result
    const urgent = await Sample.countDocuments({ "results.isCritical": true });

    res.json({ pending, inProgress, completedToday, urgent });
  } catch (err) {
    console.error("/dashboard/kpis error", err);
    res.status(500).json({ message: "Failed to fetch KPIs" });
  }
});

router.get("/recent-tests", async (_req: Request, res: Response) => {
  try {
    const tests = await Sample.find().sort({ createdAt: -1 }).limit(5);
    res.json(tests);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tests" });
  }
});

export default router;
