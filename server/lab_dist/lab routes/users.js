"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcrypt = __importStar(require("bcryptjs"));
const User_1 = __importDefault(require("../lab models/User"));
const AuditLog_1 = __importDefault(require("../lab models/AuditLog"));
const router = (0, express_1.Router)();
// Normalize role to backend canonical form
const normalizeRole = (role) => {
    if (!role)
        return role;
    return role === "lab-technician" ? "labTech" : role;
};
// List users
const listHandler = async (_req, res) => {
    try {
        const users = await User_1.default.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
        res.json({ users });
    }
    catch (err) {
        console.error("[lab/users] list error", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Create user
const createHandler = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            return res.status(400).json({ errors: errors.array() });
        let { username, password, role } = req.body;
        role = normalizeRole(role);
        const existing = await User_1.default.findOne({ username });
        if (existing)
            return res.status(409).json({ message: "User exists" });
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User_1.default.create({ username, passwordHash, role });
        await AuditLog_1.default.create({ action: "create_user", entity: "LabUser", user: username, details: { role } });
        res.status(201).json({ id: user._id });
    }
    catch (err) {
        console.error("[lab/users] create error", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Update user (email/role/password)
const updateHandler = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            return res.status(400).json({ errors: errors.array() });
        const { id } = req.params;
        let { role, password } = req.body;
        role = normalizeRole(role);
        const update = {};
        if (role !== undefined)
            update.role = role;
        if (password)
            update.passwordHash = await bcrypt.hash(password, 10);
        const prev = await User_1.default.findByIdAndUpdate(id, update, { new: true });
        if (!prev)
            return res.status(404).json({ message: "Not found" });
        await AuditLog_1.default.create({ action: "update_user", entity: "LabUser", details: { id, role, changedPassword: Boolean(password) } });
        res.json({ ok: true });
    }
    catch (err) {
        console.error("[lab/users] update error", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Delete user
const deleteHandler = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            return res.status(400).json({ errors: errors.array() });
        const { id } = req.params;
        const user = await User_1.default.findByIdAndDelete(id);
        if (!user)
            return res.status(404).json({ message: "Not found" });
        await AuditLog_1.default.create({ action: "delete_user", entity: "LabUser", details: { id, username: user.username } });
        res.json({ ok: true });
    }
    catch (err) {
        console.error("[lab/users] delete error", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
router.get("/", listHandler);
router.post("/", [
    (0, express_validator_1.body)("username").isLength({ min: 3 }),
    (0, express_validator_1.body)("password").isLength({ min: 3 }),
    (0, express_validator_1.body)("role").isIn(["lab-technician", "labTech", "receptionist", "researcher"]),
], createHandler);
router.put("/:id", [
    (0, express_validator_1.param)("id").isString(),
    (0, express_validator_1.body)("role").optional().isIn(["lab-technician", "labTech", "receptionist", "researcher"]),
    (0, express_validator_1.body)("password").optional().isLength({ min: 3 }),
], updateHandler);
router.delete("/:id", [(0, express_validator_1.param)("id").isString()], deleteHandler);
exports.default = router;
