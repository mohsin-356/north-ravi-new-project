import { Router } from "express";
import { body, validationResult } from "express-validator";
import Category from "../lab models/Category";
import InventoryItem from "../lab models/InventoryItem";
import Notification from "../lab models/Notification";
import Finance from "../lab models/Finance";

const router = Router();

// Auth disabled for inventory endpoints (open access)

// ----------------- Category CRUD -----------------

// List all categories
router.get("/categories", async (_req: any, res: any): Promise<void> => {
  const cats = await Category.find();
  res.json(cats);
});

// Create category
router.post(
  "/categories",
  [body("name").notEmpty().withMessage("Name is required")],
  async (req: any, res: any): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    try {
      const cat = await Category.create(req.body);
      res.status(201).json(cat);
    } catch (err) {
      res.status(500).json({ message: "Failed to create category" });
    }
  }
);

// ----------------- Inventory CRUD -----------------

// List inventory items
router.get("/inventory", async (req: any, res: any): Promise<void> => {
  try {
    const q = (req.query.q as string) || "";
    const category = (req.query.category as string) || "";
    const supplier = (req.query.supplier as string) || "";
    const hasPaging = typeof req.query.page !== 'undefined' || typeof req.query.limit !== 'undefined' || !!q || !!category || !!supplier;

    const filter: any = {};
    if (q && q.trim()) {
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(esc(q.trim()), 'i');
      filter.$or = [
        { name: rx },
        { supplier: rx },
        { location: rx },
        { invoiceNumber: rx },
      ];
    }
    if (category && category !== 'all') filter.category = category;
    if (supplier && supplier !== 'all') filter.supplier = supplier;

    if (!hasPaging) {
      const items = await InventoryItem.find(filter).populate("category");
      res.json(items);
      return;
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      InventoryItem.find(filter).populate("category").sort({ updatedAt: -1 }).skip(skip).limit(limit),
      InventoryItem.countDocuments(filter),
    ]);
    res.json({ data: items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    res.status(500).json({ message: "Failed to load inventory" });
  }
});

// Create inventory item
router.post(
  "/inventory",
  [
    body("name").notEmpty(),
    body("category").notEmpty(),
    body("currentStock").optional().isInt({ min: 0 }),
    body("minThreshold").isInt({ min: 0 }),
    body("maxCapacity").isInt({ min: 0 }),
    body("unit").notEmpty(),
    body("costPerUnit").optional().isFloat({ min: 0 }),
    body("supplier").notEmpty(),
    body("location").notEmpty(),
  ],
  async (req: any, res: any): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    try {
      const payload: any = { ...req.body };
      const packs = parseFloat(String(payload.packs ?? 0)) || 0;
      const itemsPerPack = parseFloat(String(payload.itemsPerPack ?? 0)) || 0;
      const buyPricePerPack = parseFloat(String(payload.buyPricePerPack ?? 0)) || 0;
      const salePricePerPack = payload.salePricePerPack != null ? (parseFloat(String(payload.salePricePerPack)) || 0) : undefined;
      if (packs > 0 && itemsPerPack > 0) {
        payload.currentStock = packs * itemsPerPack;
      }
      if (itemsPerPack > 0 && buyPricePerPack > 0) {
        payload.costPerUnit = buyPricePerPack / itemsPerPack;
      }
      if (salePricePerPack != null && itemsPerPack > 0) {
        payload.salePricePerUnit = salePricePerPack / itemsPerPack;
      }
      const item = await InventoryItem.create(payload);
      // Best-effort notification for lab staff
      try {
        await Notification.create({
          title: "Inventory Item Added",
          message: `${item.name} added to inventory` as any,
          type: "success",
          category: "inventory",
          userRole: "labTech",
        } as any);
      } catch (e) {
        console.warn("[Notifications] Failed to create inventory add notification", e);
      }
      // Create finance expense for initial purchase if pack info provided
      try {
        const packsNum = parseFloat(String(payload.packs ?? 0)) || 0;
        const buyPerPack = parseFloat(String(payload.buyPricePerPack ?? 0)) || 0;
        if (packsNum > 0 && buyPerPack > 0) {
          const amount = packsNum * buyPerPack;
          await Finance.create({
            type: "expense",
            category: "Supplies",
            description: `Purchase ${item.name} x${packsNum} packs from ${item.supplier}`,
            amount,
            reference: String(item._id),
          } as any);
        }
      } catch (e) {
        console.warn("[Finance] Failed to log initial purchase expense", e);
      }
      res.status(201).json(item);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Inventory creation error:', err);
        res.status(500).json({ 
          message: "Failed to create item",
          error: err.message 
        });
      } else {
        console.error('Unknown inventory creation error:', err);
        res.status(500).json({ message: "Failed to create item" });
      }
    }
  }
);

// Update inventory item
router.put("/inventory/:id", async (req: any, res: any): Promise<void> => {
  try {
    const payload: any = { ...req.body };
    // Load existing item to compute deltas and defaults
    const existing = await InventoryItem.findById(req.params.id);
    if (!existing) { res.status(404).json({ message: "Item not found" }); return; }
    const packs = parseFloat(String(payload.packs ?? 0)) || 0;
    const itemsPerPack = parseFloat(String(payload.itemsPerPack ?? 0)) || 0;
    const buyPricePerPack = parseFloat(String(payload.buyPricePerPack ?? 0)) || 0;
    const salePricePerPack = payload.salePricePerPack != null ? (parseFloat(String(payload.salePricePerPack)) || 0) : undefined;
    if (packs > 0 && itemsPerPack > 0) {
      payload.currentStock = packs * itemsPerPack;
    }
    if (itemsPerPack > 0 && buyPricePerPack > 0) {
      payload.costPerUnit = buyPricePerPack / itemsPerPack;
    }
    if (salePricePerPack != null && itemsPerPack > 0) {
      payload.salePricePerUnit = salePricePerPack / itemsPerPack;
    }
    const updated = await InventoryItem.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) { res.status(404).json({ message: "Item not found" }); return; }
    // Finance logging: packs purchase or loose units increase
    try {
      if (packs > 0 && buyPricePerPack > 0) {
        const amount = packs * buyPricePerPack;
        await Finance.create({
          type: "expense",
          category: "Supplies",
          description: `Restock ${updated.name} x${packs} packs from ${updated.supplier}`,
          amount,
          reference: String(updated._id),
        } as any);
      } else if (payload.looseDelta != null) {
        const delta = parseFloat(String(payload.looseDelta)) || 0;
        if (delta > 0) {
          const cpu = updated.costPerUnit || existing.costPerUnit || 0;
          const amount = delta * cpu;
          if (amount > 0) {
            await Finance.create({
              type: "expense",
              category: "Supplies",
              description: `Adjust +${delta} ${updated.unit} for ${updated.name}`,
              amount,
              reference: String(updated._id),
            } as any);
          }
        }
      }
    } catch (e) {
      console.warn("[Finance] Failed to log restock expense", e);
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update item" });
  }
});

// Delete inventory item
router.delete("/inventory/:id", async (req: any, res: any): Promise<void> => {
  try {
    const removed = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!removed) { res.status(404).json({ message: "Item not found" }); return; }
    res.json({});
  } catch (err) {
    res.status(500).json({ message: "Failed to delete item" });
  }
});

export default router;
