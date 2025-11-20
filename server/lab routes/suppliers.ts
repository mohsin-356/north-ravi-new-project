import { Router } from "express";
import { verifyJWT, authorizeRoles } from "./localAuth";
import { body, validationResult } from "express-validator";
import Supplier from "../lab models/Supplier";
import InventoryItem from "../lab models/InventoryItem";
import Finance from "../lab models/Finance";

const router = Router();

router.use(verifyJWT as any, authorizeRoles(["labTech", "researcher"]) as any);

// List suppliers
router.get("/", async (req: any, res: any) => {
  try {
    const q = (req.query.q as string) || "";
    const hasPaging = typeof req.query.page !== 'undefined' || typeof req.query.limit !== 'undefined' || !!q;
    const filter: any = {};
    if (q && q.trim()) {
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(esc(q.trim()), 'i');
      filter.$or = [ { name: rx }, { email: rx }, { phone: rx }, { company: rx } ];
    }
    if (!hasPaging) {
      const list = await Supplier.find(filter).sort({ name: 1 });
      res.json(list);
      return;
    }
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Supplier.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Supplier.countDocuments(filter),
    ]);
    res.json({ data: items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch suppliers" });
  }
});

// Supplier spend summary (total, last purchase, count)
router.get("/:id/summary", async (req: any, res: any) => {
  try {
    const sup = await Supplier.findById(req.params.id);
    if (!sup) { res.status(404).json({ message: "Supplier not found" }); return; }
    const items = await InventoryItem.find({ supplier: sup.name }).select({ _id: 1 });
    const ids = items.map(i => String(i._id));
    if (ids.length === 0) { res.json({ totalSpend: 0, purchases: 0, lastPurchaseDate: null }); return; }
    const expenses = await Finance.find({ type: 'expense', reference: { $in: ids } }).sort({ date: -1 });
    const totalSpend = expenses.reduce((sum, e) => sum + (Number((e as any).amount) || 0), 0);
    const purchases = expenses.length;
    const lastPurchaseDate = purchases ? expenses[0].date : null;
    res.json({ totalSpend, purchases, lastPurchaseDate });
  } catch (err) {
    res.status(500).json({ message: "Failed to load supplier summary" });
  }
});

// Create supplier
router.post(
  "/",
  [body("name").notEmpty().withMessage("Name is required")],
  async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    try {
      const created = await Supplier.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ message: "Failed to create supplier" });
    }
  }
);

// Get single supplier
router.get("/:id", async (req: any, res: any) => {
  const doc = await Supplier.findById(req.params.id);
  if (!doc) { res.status(404).json({ message: "Supplier not found" }); return; }
  res.json(doc);
});

// Update supplier
router.put("/:id", async (req: any, res: any) => {
  try {
    const updated = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) { res.status(404).json({ message: "Supplier not found" }); return; }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update supplier" });
  }
});

// Delete supplier
router.delete("/:id", async (req: any, res: any) => {
  try {
    const removed = await Supplier.findByIdAndDelete(req.params.id);
    if (!removed) { res.status(404).json({ message: "Supplier not found" }); return; }
    res.json({});
  } catch (err) {
    res.status(500).json({ message: "Failed to delete supplier" });
  }
});

// History by supplier name
router.get("/:id/history", async (req: any, res: any) => {
  try {
    const sup = await Supplier.findById(req.params.id);
    if (!sup) { res.status(404).json({ message: "Supplier not found" }); return; }
    const items = await InventoryItem.find({ supplier: sup.name }).sort({ updatedAt: -1 });
    res.json({ supplier: sup, items });
  } catch (err) {
    res.status(500).json({ message: "Failed to load history" });
  }
});

export default router;
