"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Setting_1 = __importDefault(require("../lab models/Setting"));
const audit_1 = require("../lab utils/audit");
const router = (0, express_1.Router)();
// Only authenticated lab technicians (or admin role) can view/update settings
// import { verifyJWT, authorizeRoles } from "../middleware/auth";
// router.use(verifyJWT, authorizeRoles(["labTechnician", "admin"]));
// Get current settings
router.get("/", async (_req, res) => {
    try {
        const setting = await Setting_1.default.findOne();
        if (setting === null || setting === void 0 ? void 0 : setting.pricing) {
            // Back-compat field for older UIs expecting bulkDiscountRate
            const p = setting.pricing;
            if (p.discountRate != null && p.bulkDiscountRate == null) {
                p.bulkDiscountRate = p.discountRate;
            }
        }
        res.json(setting);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch settings" });
    }
});
// Update or create settings (upsert)
router.put("/", async (req, res) => {
    var _a;
    try {
        // Sanitize and map incoming body to new schema
        const body = req.body || {};
        const lab = body.lab || {};
        const pricingIn = body.pricing || {};
        const regional = body.regional || {};
        const notifications = body.notifications || {};
        const backup = body.backup || undefined;
        const pricing = {
            defaultCurrency: pricingIn.defaultCurrency,
            taxRate: pricingIn.taxRate,
            // Prefer new field but support old bulkDiscountRate
            discountRate: pricingIn.discountRate != null ? pricingIn.discountRate : pricingIn.bulkDiscountRate,
        };
        const updateDoc = {
            lab: {
                labName: lab.labName,
                address: lab.address,
                phone: lab.phone,
                email: lab.email,
                website: lab.website,
                license: lab.license,
            },
            pricing,
            regional: {
                timezone: regional.timezone,
                defaultLanguage: regional.defaultLanguage,
            },
            notifications,
        };
        if (backup)
            updateDoc.backup = backup;
        const updated = await Setting_1.default.findOneAndUpdate({}, updateDoc, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        try {
            await (0, audit_1.logAudit)(req, "update_settings", "LabSettings", {
                labName: (_a = updateDoc === null || updateDoc === void 0 ? void 0 : updateDoc.lab) === null || _a === void 0 ? void 0 : _a.labName,
                hasPricing: !!(updateDoc === null || updateDoc === void 0 ? void 0 : updateDoc.pricing),
            });
        }
        catch { }
        // Mirror field for backward compatibility in response
        const resp = (updated === null || updated === void 0 ? void 0 : updated.toObject) ? updated.toObject() : updated;
        if (resp === null || resp === void 0 ? void 0 : resp.pricing) {
            if (resp.pricing.discountRate != null) {
                resp.pricing.bulkDiscountRate = resp.pricing.discountRate;
            }
            // Strip removed fields if they exist
            delete resp.pricing.discountThreshold;
            delete resp.pricing.emergencyCharges;
            delete resp.pricing.homeCollectionCharges;
        }
        res.json(resp);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to update settings" });
    }
});
exports.default = router;
