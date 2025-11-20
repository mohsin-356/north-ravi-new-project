import { Router } from "express";
import Report from "../lab models/Report";
import ReportTemplate from "../lab models/ReportTemplate";

const router = Router();

// Auth disabled for report routes
const allowAll = (_req: any, _res: any, next: any) => next();

// ----- Reports CRUD -----
// List reports — allowed for all three roles
router.get("/reports", allowAll, async (_req: any, res: any): Promise<void> => {
  const reports = await Report.find().sort({ createdAt: -1 });
  res.json(reports);
});

// Create report — allowed for all three roles (report generator)
router.post("/reports", allowAll, async (req: any, res: any): Promise<void> => {
  try {
    const created = await Report.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: "Failed to create report" });
  }
});

// Update report — allowed for all three roles
router.put("/reports/:id", allowAll, async (req: any, res: any): Promise<void> => {
  try {
    const updated = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) { res.status(404).json({ message: "Report not found" }); return; }
    res.json(updated);
  } catch { res.status(500).json({ message: "Failed to update report" }); }
});

// Delete report — allowed for all three roles
router.delete("/reports/:id", allowAll, async (req: any, res: any): Promise<void> => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.json({});
  } catch { res.status(500).json({ message: "Failed to delete report" }); }
});

// ----- Report Templates CRUD -----
// List templates — allowed for all three roles
router.get("/report-templates", allowAll, async (_req: any, res: any): Promise<void> => {
  const templates = await ReportTemplate.find();
  res.json(templates);
});

// Create template — allowed for all three roles
router.post("/report-templates", allowAll, async (req: any, res: any): Promise<void> => {
  try {
    const created = await ReportTemplate.create(req.body);
    res.status(201).json(created);
  } catch { res.status(500).json({ message: "Failed to create template" }); }
});

// Update template — allowed for all three roles
router.put("/report-templates/:id", allowAll, async (req: any, res: any): Promise<void> => {
  try {
    const updated = await ReportTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) { res.status(404).json({ message: "Template not found" }); return; }
    res.json(updated);
  } catch { res.status(500).json({ message: "Failed to update template" }); }
});

// Delete template — allowed for all three roles
router.delete("/report-templates/:id", allowAll, async (req: any, res: any): Promise<void> => {
  try {
    await ReportTemplate.findByIdAndDelete(req.params.id);
    res.json({});
  } catch { res.status(500).json({ message: "Failed to delete template" }); }
});

export default router;
