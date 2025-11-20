import { Router } from "express";
import { query } from "express-validator";
import AuditLog from "../lab models/AuditLog";

const router = Router();

const listHandler = async (req: any, res: any) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || 50), 10) || 50, 500);
    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ logs });
  } catch (err) {
    console.error("[lab/audit] list error", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

router.get("/", [query("limit").optional().isInt({ min: 1, max: 500 })], listHandler);

export default router;
