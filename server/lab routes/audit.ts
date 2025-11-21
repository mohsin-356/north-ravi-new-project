import { Router } from "express";
import { query } from "express-validator";
import AuditLog from "../lab models/AuditLog";

const router = Router();

const listHandler = async (req: any, res: any) => {
  try {
    const rawLimit = parseInt(String(req.query.limit || 50), 10) || 50;
    const rawSkip = parseInt(String(req.query.skip || 0), 10) || 0;
    const limit = Math.min(Math.max(rawLimit, 1), 500);
    const skip = Math.max(rawSkip, 0);

    const search = (req.query.search as string) || "";
    const action = (req.query.action as string) || "";
    const from = (req.query.from as string) || ""; // yyyy-mm-dd
    const to = (req.query.to as string) || "";     // yyyy-mm-dd

    const filter: any = {};

    if (action && action !== "all") {
      // match exact or prefix to support values like create_user, update_sample, etc.
      filter.action = { $regex: new RegExp("^" + action, "i") };
    }

    if (from || to) {
      filter.createdAt = {} as any;
      if (from) (filter.createdAt as any).$gte = new Date(`${from}T00:00:00`);
      if (to) (filter.createdAt as any).$lte = new Date(`${to}T23:59:59`);
    }

    if (search && search.trim()) {
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
      const rx = new RegExp(esc(search.trim()), "i");
      filter.$or = [
        { action: rx },
        { entity: rx },
        { user: rx },
      ];
    }

    const [logs, total] = await Promise.all([
      (AuditLog as any)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      (AuditLog as any).countDocuments(filter),
    ]);

    res.json({ logs, total });
  } catch (err) {
    console.error("[lab/audit] list error", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

router.get(
  "/",
  [
    query("limit").optional().isInt({ min: 1, max: 500 }),
    query("skip").optional().isInt({ min: 0 }),
    query("from").optional().isISO8601(),
    query("to").optional().isISO8601(),
  ],
  listHandler
);

export default router;
