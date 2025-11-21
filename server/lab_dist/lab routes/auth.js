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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const User_1 = __importDefault(require("../lab models/User"));
const router = (0, express_1.Router)();
// Normalize role to backend canonical form
const normalizeRole = (role) => {
    if (!role)
        return role;
    return role === "lab-technician" ? "labTech" : role;
};
// Register handler (typed)
const registerHandler = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        let { username, password, role } = req.body;
        role = normalizeRole(role);
        const existing = await User_1.default.findOne({ username });
        if (existing) {
            res.status(409).json({ message: "User exists" });
            return;
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User_1.default.create({ username, passwordHash, role });
        res.status(201).json({ id: user._id });
        return;
    }
    catch (err) {
        console.error('[lab/auth] register error:', err);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
};
router.post("/register", [
    (0, express_validator_1.body)("username").isLength({ min: 3 }),
    (0, express_validator_1.body)("password").isLength({ min: 6 }),
    (0, express_validator_1.body)("role").isIn(["lab-technician", "labTech", "receptionist", "researcher"]),
], registerHandler);
// Quick health for mounting verification
router.get("/ping", (_req, res) => {
    res.json({ ok: true });
});
// Login handler (typed)
const loginHandler = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { username, password } = req.body;
        const user = await User_1.default.findOne({ username });
        if (!user) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const token = jwt.sign({ uid: user._id, role: user.role, username: user.username }, process.env.JWT_SECRET || "secret", { expiresIn: "1h" });
        res.json({ token, role: user.role });
        return;
    }
    catch (err) {
        console.error('[lab/auth] login error:', err);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
};
router.post("/login", [(0, express_validator_1.body)("username").isLength({ min: 3 }), (0, express_validator_1.body)("password").exists()], loginHandler);
exports.default = router;
