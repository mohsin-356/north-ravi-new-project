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
exports.initDailyBackup = exports.restoreBackup = exports.purgeData = exports.performBackup = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const node_cron_1 = __importDefault(require("node-cron"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const Setting_1 = __importDefault(require("../lab models/Setting"));
const BACKUP_DIR = path.join(__dirname, "../../backups");
// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
let dailyJob;
/**
 * Perform a MongoDB dump, compressed as gzip into the backups folder.
 * Returns the absolute file path once finished.
 */
const performBackup = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
    // Export all collections as JSON
    const db = mongoose_1.default.connection.db;
    if (!db) {
        throw new Error("Database connection not ready for backup");
    }
    const exportObj = {};
    const collections = await db.listCollections().toArray();
    for (const coll of collections) {
        const docs = await db.collection(coll.name).find({}).toArray();
        exportObj[coll.name] = docs;
    }
    fs.writeFileSync(filePath, JSON.stringify(exportObj, null, 2), "utf-8");
    return filePath;
};
exports.performBackup = performBackup;
/**
 * Schedule daily backups at the provided cron time (default 2 AM local time).
 * Reads backup settings from the database if not supplied.
 */
const purgeData = async () => {
    const db = mongoose_1.default.connection.db;
    if (!db)
        throw new Error("Database connection not ready for purge");
    const collections = await db.listCollections().toArray();
    for (const coll of collections) {
        await db.collection(coll.name).deleteMany({});
    }
};
exports.purgeData = purgeData;
const restoreBackup = async (data) => {
    const db = mongoose_1.default.connection.db;
    if (!db)
        throw new Error("Database connection not ready for restore");
    const entries = Object.entries(data);
    for (const [name, docs] of entries) {
        const collection = db.collection(name);
        await collection.deleteMany({});
        if (docs.length)
            await collection.insertMany(docs);
    }
};
exports.restoreBackup = restoreBackup;
const initDailyBackup = async () => {
    var _a, _b, _c;
    try {
        const setting = await Setting_1.default.findOne();
        const enabled = (_b = (_a = setting === null || setting === void 0 ? void 0 : setting.backup) === null || _a === void 0 ? void 0 : _a.enabled) !== null && _b !== void 0 ? _b : false;
        const time = ((_c = setting === null || setting === void 0 ? void 0 : setting.backup) === null || _c === void 0 ? void 0 : _c.time) || "0 2 * * *"; // 2:00 AM every day
        if (!enabled)
            return;
        // Prevent multiple schedules
        if (dailyJob) {
            dailyJob.stop();
        }
        dailyJob = node_cron_1.default.schedule(time, async () => {
            try {
                await (0, exports.performBackup)();
                console.log("Daily backup completed");
            }
            catch (err) {
                console.error("Daily backup failed", err);
            }
        });
        console.log(`Daily backup scheduled at cron: ${time}`);
    }
    catch (err) {
        console.error("Failed to init daily backup", err);
    }
};
exports.initDailyBackup = initDailyBackup;
