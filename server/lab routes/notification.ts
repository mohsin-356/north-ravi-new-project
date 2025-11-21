import { Router } from "express";
import Notification from "../lab models/Notification";
import { logAudit } from "../lab utils/audit";

const router = Router();

// Auth disabled for notifications: open access

// GET /notification - list notifications, latest first
router.get("/", async (req: any, res: any) => {
  try {
    const { unread } = req.query as any;
    const q = (req.query.q as string) || "";
    const page = req.query.page != null ? Math.max(1, parseInt(String(req.query.page || '1'), 10)) : null;
    const limit = req.query.limit != null ? Math.min(200, Math.max(1, parseInt(String(req.query.limit || '20'), 10))) : null;
    const hasPaging = page != null || limit != null || !!q || typeof unread !== 'undefined';

    const filter: any = {};
    if (String(unread).toLowerCase() === 'true') filter.read = false;
    if (q && q.trim()) {
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(esc(q.trim()), 'i');
      filter.$or = [ { title: rx }, { message: rx }, { category: rx }, { type: rx } ];
    }

    if (!hasPaging) {
      const lim = Math.min(200, Math.max(1, parseInt(String((req.query as any).limit || '50'), 10)));
      const docs = await Notification.find(filter).sort({ createdAt: -1 }).limit(Number(lim));
      res.json(docs);
      return;
    }

    const p = page ?? 1;
    const l = limit ?? 20;
    const skip = (p - 1) * l;
    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l),
      Notification.countDocuments(filter),
    ]);
    res.json({ data: items, page: p, limit: l, total, totalPages: Math.max(1, Math.ceil(total / l)) });
    return;
  } catch (err) {
    console.error("Failed to fetch notifications", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
    return;
  }
});

// PATCH /notification/:id/read - mark as read
router.patch("/:id/read", async (req: any, res: any) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
    notif.read = true;
    await notif.save();
    try {
      await logAudit(req as any, "read_notification", "LabNotification", {
        id: (notif as any)._id,
        title: (notif as any).title,
      });
    } catch {}
    res.json(notif);
    return;
  } catch {
    res.status(500).json({ message: "Failed to update notification" });
    return;
  }
});

export default router;
