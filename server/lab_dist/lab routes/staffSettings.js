"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const StaffSetting_1 = __importDefault(require("../lab models/StaffSetting"));
const router = (0, express_1.Router)();
// import { verifyJWT, authorizeRoles } from "../middleware/auth";
//// router.use(verifyJWT, authorizeRoles(["labTech"])); // adjust role as needed
// List all settings
router.get("/", async (_req, res) => {
    const settings = await StaffSetting_1.default.find();
    res.json(settings);
});
// Get by key
router.get("/:key", async (req, res) => {
    const setting = await StaffSetting_1.default.findOne({ key: req.params.key });
    if (!setting) {
        // Return a sensible default instead of 404 so UI can initialize settings
        res.json({ key: req.params.key, value: {}, description: "" });
        return;
    }
    res.json(setting);
    return;
});
// Upsert setting
router.put("/:key", [(0, express_validator_1.body)("value").not().isEmpty()], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const updated = await StaffSetting_1.default.findOneAndUpdate({ key: req.params.key }, { value: req.body.value, description: req.body.description }, { new: true, upsert: true });
        res.json(updated);
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Failed to save setting" });
        return;
    }
});
exports.default = router;
