"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const backup_1 = require("../lab utils/backup");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// POST /backup/manual – trigger a manual backup and return file information
router.post("/manual", async (_req, res) => {
    try {
        const filePath = await (0, backup_1.performBackup)();
        const fileName = path_1.default.basename(filePath);
        res.json({ fileName });
    }
    catch (err) {
        console.error("Manual backup failed", err);
        res.status(500).json({ message: "Manual backup failed" });
    }
});
// GET /backup/download/:fileName – download a backup file
router.get("/download/:fileName", (req, res) => {
    const { fileName } = req.params;
    const fullPath = path_1.default.join(__dirname, "../../backups", fileName);
    if (!fs_1.default.existsSync(fullPath)) {
        res.status(404).json({ message: "Backup not found" });
        return;
    }
    res.download(fullPath);
});
// GET /backup/list – list available backups (names, dates)
router.post("/purge", async (_req, res) => {
    try {
        await (0, backup_1.purgeData)();
        res.json({ message: "All data deleted" });
    }
    catch (err) {
        console.error("Purge failed", err);
        res.status(500).json({ message: "Purge failed" });
    }
});
router.post("/restore", async (req, res) => {
    try {
        const data = req.body;
        if (!data || typeof data !== "object") {
            res.status(400).json({ message: "Invalid backup data" });
            return;
        }
        await (0, backup_1.restoreBackup)(data);
        res.json({ message: "Data restored" });
    }
    catch (err) {
        console.error("Restore failed", err);
        res.status(500).json({ message: "Restore failed" });
    }
});
router.get("/list", (_req, res) => {
    const dir = path_1.default.join(__dirname, "../../backups");
    if (!fs_1.default.existsSync(dir)) {
        res.json([]);
        return;
    }
    const files = fs_1.default
        .readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => ({ fileName: f, date: fs_1.default.statSync(path_1.default.join(dir, f)).mtime }));
    res.json(files);
});
exports.default = router;
