"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const Category_1 = __importDefault(require("../lab models/Category"));
const InventoryItem_1 = __importDefault(require("../lab models/InventoryItem"));
const Notification_1 = __importDefault(require("../lab models/Notification"));
const Finance_1 = __importDefault(require("../lab models/Finance"));
const router = (0, express_1.Router)();
// Auth disabled for inventory endpoints (open access)
// ----------------- Category CRUD -----------------
// List all categories
router.get("/categories", async (_req, res) => {
    const cats = await Category_1.default.find();
    res.json(cats);
});
// Create category
router.post("/categories", [(0, express_validator_1.body)("name").notEmpty().withMessage("Name is required")], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const cat = await Category_1.default.create(req.body);
        res.status(201).json(cat);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to create category" });
    }
});
// ----------------- Inventory CRUD -----------------
// List inventory items
router.get("/inventory", async (req, res) => {
    try {
        const q = req.query.q || "";
        const category = req.query.category || "";
        const supplier = req.query.supplier || "";
        const hasPaging = typeof req.query.page !== 'undefined' || typeof req.query.limit !== 'undefined' || !!q || !!category || !!supplier;
        const filter = {};
        if (q && q.trim()) {
            const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const rx = new RegExp(esc(q.trim()), 'i');
            filter.$or = [
                { name: rx },
                { supplier: rx },
                { location: rx },
                { invoiceNumber: rx },
            ];
        }
        if (category && category !== 'all')
            filter.category = category;
        if (supplier && supplier !== 'all')
            filter.supplier = supplier;
        if (!hasPaging) {
            const items = await InventoryItem_1.default.find(filter).populate("category");
            res.json(items);
            return;
        }
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            InventoryItem_1.default.find(filter).populate("category").sort({ updatedAt: -1 }).skip(skip).limit(limit),
            InventoryItem_1.default.countDocuments(filter),
        ]);
        res.json({ data: items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to load inventory" });
    }
});
// Create inventory item
router.post("/inventory", [
    (0, express_validator_1.body)("name").notEmpty(),
    (0, express_validator_1.body)("category").notEmpty(),
    (0, express_validator_1.body)("currentStock").optional().isInt({ min: 0 }),
    (0, express_validator_1.body)("minThreshold").isInt({ min: 0 }),
    (0, express_validator_1.body)("maxCapacity").isInt({ min: 0 }),
    (0, express_validator_1.body)("unit").notEmpty(),
    (0, express_validator_1.body)("costPerUnit").optional().isFloat({ min: 0 }),
    (0, express_validator_1.body)("supplier").notEmpty(),
    (0, express_validator_1.body)("location").notEmpty(),
], async (req, res) => {
    var _a, _b, _c, _d, _e;
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const payload = { ...req.body };
        const packs = parseFloat(String((_a = payload.packs) !== null && _a !== void 0 ? _a : 0)) || 0;
        const itemsPerPack = parseFloat(String((_b = payload.itemsPerPack) !== null && _b !== void 0 ? _b : 0)) || 0;
        const buyPricePerPack = parseFloat(String((_c = payload.buyPricePerPack) !== null && _c !== void 0 ? _c : 0)) || 0;
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
        const item = await InventoryItem_1.default.create(payload);
        // Best-effort notification for lab staff
        try {
            await Notification_1.default.create({
                title: "Inventory Item Added",
                message: `${item.name} added to inventory`,
                type: "success",
                category: "inventory",
                userRole: "labTech",
            });
        }
        catch (e) {
            console.warn("[Notifications] Failed to create inventory add notification", e);
        }
        // Create finance expense for initial purchase if pack info provided
        try {
            const packsNum = parseFloat(String((_d = payload.packs) !== null && _d !== void 0 ? _d : 0)) || 0;
            const buyPerPack = parseFloat(String((_e = payload.buyPricePerPack) !== null && _e !== void 0 ? _e : 0)) || 0;
            if (packsNum > 0 && buyPerPack > 0) {
                const amount = packsNum * buyPerPack;
                await Finance_1.default.create({
                    type: "expense",
                    category: "Supplies",
                    description: `Purchase ${item.name} x${packsNum} packs from ${item.supplier}`,
                    amount,
                    reference: String(item._id),
                });
            }
        }
        catch (e) {
            console.warn("[Finance] Failed to log initial purchase expense", e);
        }
        res.status(201).json(item);
    }
    catch (err) {
        if (err instanceof Error) {
            console.error('Inventory creation error:', err);
            res.status(500).json({
                message: "Failed to create item",
                error: err.message
            });
        }
        else {
            console.error('Unknown inventory creation error:', err);
            res.status(500).json({ message: "Failed to create item" });
        }
    }
});
// Update inventory item
router.put("/inventory/:id", async (req, res) => {
    var _a, _b, _c;
    try {
        const payload = { ...req.body };
        // Load existing item to compute deltas and defaults
        const existing = await InventoryItem_1.default.findById(req.params.id);
        if (!existing) {
            res.status(404).json({ message: "Item not found" });
            return;
        }
        const packs = parseFloat(String((_a = payload.packs) !== null && _a !== void 0 ? _a : 0)) || 0;
        const itemsPerPack = parseFloat(String((_b = payload.itemsPerPack) !== null && _b !== void 0 ? _b : 0)) || 0;
        const buyPricePerPack = parseFloat(String((_c = payload.buyPricePerPack) !== null && _c !== void 0 ? _c : 0)) || 0;
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
        const updated = await InventoryItem_1.default.findByIdAndUpdate(req.params.id, payload, { new: true });
        if (!updated) {
            res.status(404).json({ message: "Item not found" });
            return;
        }
        // Finance logging: packs purchase or loose units increase
        try {
            if (packs > 0 && buyPricePerPack > 0) {
                const amount = packs * buyPricePerPack;
                await Finance_1.default.create({
                    type: "expense",
                    category: "Supplies",
                    description: `Restock ${updated.name} x${packs} packs from ${updated.supplier}`,
                    amount,
                    reference: String(updated._id),
                });
            }
            else if (payload.looseDelta != null) {
                const delta = parseFloat(String(payload.looseDelta)) || 0;
                if (delta > 0) {
                    const cpu = updated.costPerUnit || existing.costPerUnit || 0;
                    const amount = delta * cpu;
                    if (amount > 0) {
                        await Finance_1.default.create({
                            type: "expense",
                            category: "Supplies",
                            description: `Adjust +${delta} ${updated.unit} for ${updated.name}`,
                            amount,
                            reference: String(updated._id),
                        });
                    }
                }
            }
        }
        catch (e) {
            console.warn("[Finance] Failed to log restock expense", e);
        }
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to update item" });
    }
});
// Delete inventory item
router.delete("/inventory/:id", async (req, res) => {
    try {
        const removed = await InventoryItem_1.default.findByIdAndDelete(req.params.id);
        if (!removed) {
            res.status(404).json({ message: "Item not found" });
            return;
        }
        res.json({});
    }
    catch (err) {
        res.status(500).json({ message: "Failed to delete item" });
    }
});
exports.default = router;
