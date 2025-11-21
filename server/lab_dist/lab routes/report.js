"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Report_1 = __importDefault(require("../lab models/Report"));
const ReportTemplate_1 = __importDefault(require("../lab models/ReportTemplate"));
const audit_1 = require("../lab utils/audit");
const router = (0, express_1.Router)();
// Auth disabled for report routes
const allowAll = (_req, _res, next) => next();
// ----- Reports CRUD -----
// List reports — allowed for all three roles
router.get("/reports", allowAll, async (_req, res) => {
    const reports = await Report_1.default.find().sort({ createdAt: -1 });
    res.json(reports);
});
// Create report — allowed for all three roles (report generator)
router.post("/reports", allowAll, async (req, res) => {
    try {
        const created = await Report_1.default.create(req.body);
        await (0, audit_1.logAudit)(req, "create_report", "LabReport", { id: created._id, title: created.title });
        res.status(201).json(created);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to create report" });
    }
});
// Update report — allowed for all three roles
router.put("/reports/:id", allowAll, async (req, res) => {
    try {
        const updated = await Report_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) {
            res.status(404).json({ message: "Report not found" });
            return;
        }
        await (0, audit_1.logAudit)(req, "update_report", "LabReport", { id: updated._id, title: updated.title });
        res.json(updated);
    }
    catch {
        res.status(500).json({ message: "Failed to update report" });
    }
});
// Delete report — allowed for all three roles
router.delete("/reports/:id", allowAll, async (req, res) => {
    try {
        const removed = await Report_1.default.findByIdAndDelete(req.params.id);
        await (0, audit_1.logAudit)(req, "delete_report", "LabReport", { id: removed === null || removed === void 0 ? void 0 : removed._id });
        res.json({});
    }
    catch {
        res.status(500).json({ message: "Failed to delete report" });
    }
});
// ----- Report Templates CRUD -----
// List templates — allowed for all three roles
router.get("/report-templates", allowAll, async (_req, res) => {
    const templates = await ReportTemplate_1.default.find();
    res.json(templates);
});
// Create template — allowed for all three roles
router.post("/report-templates", allowAll, async (req, res) => {
    try {
        const created = await ReportTemplate_1.default.create(req.body);
        await (0, audit_1.logAudit)(req, "create_report_template", "LabReportTemplate", { id: created._id, name: created.name });
        res.status(201).json(created);
    }
    catch {
        res.status(500).json({ message: "Failed to create template" });
    }
});
// Update template — allowed for all three roles
router.put("/report-templates/:id", allowAll, async (req, res) => {
    try {
        const updated = await ReportTemplate_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) {
            res.status(404).json({ message: "Template not found" });
            return;
        }
        await (0, audit_1.logAudit)(req, "update_report_template", "LabReportTemplate", { id: updated._id, name: updated.name });
        res.json(updated);
    }
    catch {
        res.status(500).json({ message: "Failed to update template" });
    }
});
// Delete template — allowed for all three roles
router.delete("/report-templates/:id", allowAll, async (req, res) => {
    try {
        const removed = await ReportTemplate_1.default.findByIdAndDelete(req.params.id);
        await (0, audit_1.logAudit)(req, "delete_report_template", "LabReportTemplate", { id: removed === null || removed === void 0 ? void 0 : removed._id });
        res.json({});
    }
    catch {
        res.status(500).json({ message: "Failed to delete template" });
    }
});
exports.default = router;
