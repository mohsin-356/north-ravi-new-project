import mongoose from "mongoose";
import cron from "node-cron";
import * as path from "path";
import * as fs from "fs";
import Setting, { ISetting } from "../lab models/Setting";


const BACKUP_DIR = path.join(__dirname, "../../backups");

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

import { ScheduledTask } from "node-cron";
let dailyJob: ScheduledTask | undefined;

/**
 * Perform a MongoDB dump, compressed as gzip into the backups folder.
 * Returns the absolute file path once finished.
 */
export const performBackup = async (): Promise<string> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(BACKUP_DIR, `backup-${timestamp}.json`);

  // Export all collections as JSON
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not ready for backup");
  }
  const exportObj: Record<string, any[]> = {};
  const collections = await db.listCollections().toArray();
  for (const coll of collections) {
    const docs = await db.collection(coll.name).find({}).toArray();
    exportObj[coll.name] = docs;
  }
  fs.writeFileSync(filePath, JSON.stringify(exportObj, null, 2), "utf-8");
  return filePath;
};

/**
 * Schedule daily backups at the provided cron time (default 2 AM local time).
 * Reads backup settings from the database if not supplied.
 */
export const purgeData = async () => {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not ready for purge");
  const collections = await db.listCollections().toArray();
  for (const coll of collections) {
    await db.collection(coll.name).deleteMany({});
  }
};

export const restoreBackup = async (data: Record<string, any[]>) => {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not ready for restore");
  const entries = Object.entries(data);
  for (const [name, docs] of entries) {
    const collection = db.collection(name);
    await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs);
  }
};

export const initDailyBackup = async () => {
  try {
    const setting: ISetting | null = await Setting.findOne();
    const enabled = setting?.backup?.enabled ?? false;
    const time = setting?.backup?.time || "0 2 * * *"; // 2:00 AM every day

    if (!enabled) return;

        // Prevent multiple schedules
    if (dailyJob) {
      dailyJob.stop();
    }

    dailyJob = cron.schedule(time, async () => {
      try {
        await performBackup();
        console.log("Daily backup completed");
      } catch (err) {
        console.error("Daily backup failed", err);
      }
    });
    console.log(`Daily backup scheduled at cron: ${time}`);
  } catch (err) {
    console.error("Failed to init daily backup", err);
  }
};
