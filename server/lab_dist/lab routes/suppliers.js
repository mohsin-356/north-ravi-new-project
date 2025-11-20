"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const localAuth_1 = require("./localAuth");
const express_validator_1 = require("express-validator");
const Supplier_1 = __importDefault(require("../lab models/Supplier"));
const InventoryItem_1 = __importDefault(require("../lab models/InventoryItem"));
const Finance_1 = __importDefault(require("../lab models/Finance"));
const router = (0, express_1.Router)();
router.use(localAuth_1.verifyJWT, (0, localAuth_1.authorizeRoles)(["labTech", "researcher"]));
// List suppliers
router.get("/", async (req, res) => {
    try {
        const q = req.query.q || "";
        const hasPaging = typeof req.query.page !== 'undefined' || typeof req.query.limit !== 'undefined' || !!q;
        const filter = {};
        if (q && q.trim()) {
            const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const rx = new RegExp(esc(q.trim()), 'i');
            filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { company: rx }];
        }
        if (!hasPaging) {
            const list = await Supplier_1.default.find(filter).sort({ name: 1 });
            res.json(list);
            return;
        }
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            Supplier_1.default.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
            Supplier_1.default.countDocuments(filter),
        ]);
        res.json({ data: items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch suppliers" });
    }
});
// Supplier spend summary (total, last purchase, count)
router.get("/:id/summary", async (req, res) => {
    try {
        const sup = await Supplier_1.default.findById(req.params.id);
        if (!sup) {
            res.status(404).json({ message: "Supplier not found" });
            return;
        }
        const items = await InventoryItem_1.default.find({ supplier: sup.name }).select({ _id: 1 });
        const ids = items.map(i => String(i._id));
        if (ids.length === 0) {
            res.json({ totalSpend: 0, purchases: 0, lastPurchaseDate: null });
            return;
        }
        const expenses = await Finance_1.default.find({ type: 'expense', reference: { $in: ids } }).sort({ date: -1 });
        const totalSpend = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const purchases = expenses.length;
        const lastPurchaseDate = purchases ? expenses[0].date : null;
        res.json({ totalSpend, purchases, lastPurchaseDate });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to load supplier summary" });
    }
});
// Create supplier
router.post("/", [(0, express_validator_1.body)("name").notEmpty().withMessage("Name is required")], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const created = await Supplier_1.default.create(req.body);
        res.status(201).json(created);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to create supplier" });
    }
});
// Get single supplier
router.get("/:id", async (req, res) => {
    const doc = await Supplier_1.default.findById(req.params.id);
    if (!doc) {
        res.status(404).json({ message: "Supplier not found" });
        return;
    }
    res.json(doc);
});
// Update supplier
router.put("/:id", async (req, res) => {
    try {
        const updated = await Supplier_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) {
            res.status(404).json({ message: "Supplier not found" });
            return;
        }
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to update supplier" });
    }
});
// Delete supplier
router.delete("/:id", async (req, res) => {
    try {
        const removed = await Supplier_1.default.findByIdAndDelete(req.params.id);
        if (!removed) {
            res.status(404).json({ message: "Supplier not found" });
            return;
        }
        res.json({});
    }
    catch (err) {
        res.status(500).json({ message: "Failed to delete supplier" });
    }
});
// History by supplier name
router.get("/:id/history", async (req, res) => {
    try {
        const sup = await Supplier_1.default.findById(req.params.id);
        if (!sup) {
            res.status(404).json({ message: "Supplier not found" });
            return;
        }
        const items = await InventoryItem_1.default.find({ supplier: sup.name }).sort({ updatedAt: -1 });
        res.json({ supplier: sup, items });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to load history" });
    }
});
exports.default = router;
