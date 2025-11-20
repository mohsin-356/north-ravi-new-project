import { Router, Request, Response } from "express";
import { performBackup, purgeData, restoreBackup } from "../lab utils/backup";
import path from "path";
import fs from "fs";

const router = Router();

// POST /backup/manual – trigger a manual backup and return file information
router.post("/manual", async (_req: Request, res: Response): Promise<void> => {
  try {
    const filePath = await performBackup();
    const fileName = path.basename(filePath);
    res.json({ fileName });
  } catch (err) {
    console.error("Manual backup failed", err);
    res.status(500).json({ message: "Manual backup failed" });
  }
});

// GET /backup/download/:fileName – download a backup file
router.get("/download/:fileName", (req: Request, res: Response): void => {
  const { fileName } = req.params;
  const fullPath = path.join(__dirname, "../../backups", fileName);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ message: "Backup not found" });
    return;
  }
  res.download(fullPath);
});

// GET /backup/list – list available backups (names, dates)
router.post("/purge", async (_req: Request, res: Response): Promise<void> => {
  try {
    await purgeData();
    res.json({ message: "All data deleted" });
  } catch (err) {
    console.error("Purge failed", err);
    res.status(500).json({ message: "Purge failed" });
  }
});

router.post("/restore", async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    if (!data || typeof data !== "object") {
      res.status(400).json({ message: "Invalid backup data" });
      return;
    }
    await restoreBackup(data);
    res.json({ message: "Data restored" });
  } catch (err) {
    console.error("Restore failed", err);
    res.status(500).json({ message: "Restore failed" });
  }
});

router.get("/list", (_req: Request, res: Response): void => {
  const dir = path.join(__dirname, "../../backups");
  if (!fs.existsSync(dir)) {
    res.json([]);
    return;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ fileName: f, date: fs.statSync(path.join(dir, f)).mtime }));
  res.json(files);
});

export default router;
