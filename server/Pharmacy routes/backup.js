const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Types } = mongoose;
const fs = require('fs');
const path = require('path');
const BackupSettings = require('../models/BackupSettings');

let backupTimer = null;

async function runBackupToFolder(folderPath) {
  const names = await getCollectionNames();
  const backup = {};
  for (const name of names) {
    const docs = await mongoose.connection.db.collection(name).find({}).toArray();
    backup[name] = docs;
  }
  const json = JSON.stringify(backup);
  fs.mkdirSync(folderPath, { recursive: true });
  const filename = `hospital-backup-${new Date().toISOString().replace(/[:]/g, '-').split('.')[0]}.json`;
  const full = path.join(folderPath, filename);
  fs.writeFileSync(full, json, 'utf8');
  await BackupSettings.findByIdAndUpdate('backup_settings', { lastRunAt: new Date() }, { upsert: true });
}

function startScheduler(settings) {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
  if (!settings || !settings.enabled) return;
  const interval = Math.max(1, Number(settings.intervalMinutes || 0));
  const folder = settings.folderPath || '';
  if (!folder) return;
  backupTimer = setInterval(() => {
    runBackupToFolder(folder).catch((e) => console.error('Auto-backup failed:', e?.message || e));
  }, interval * 60 * 1000);
}

// Start scheduler when Mongo connection is ready
try {
  mongoose.connection.once('connected', async () => {
    try {
      const s = await BackupSettings.findById('backup_settings');
      if (s) startScheduler(s);
    } catch (e) {
      console.warn('Failed to start backup scheduler:', e?.message || e);
    }
  });
} catch {}

// Utility to get all collection names (excluding system collections)
async function getCollectionNames() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  return collections
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.')); // exclude internal
}

/*
  GET /api/backup
  Returns JSON object containing arrays for each collection.
  Sets Content-Disposition so browser downloads a .json file.
*/
router.get('/', async (req, res) => {
  try {
    const names = await getCollectionNames();
    const backup = {};

    for (const name of names) {
      const docs = await mongoose.connection.db.collection(name).find({}).toArray();
      backup[name] = docs;
    }

    const json = JSON.stringify(backup);
    const filename = `pharmacy-backup-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(json);
  } catch (err) {
    console.error('Backup export failed:', err);
    res.status(500).json({ message: 'Failed to create backup' });
  }
});

// GET /api/backup/settings -> current scheduler settings
router.get('/settings', async (_req, res) => {
  try {
    const doc = await BackupSettings.findById('backup_settings');
    res.json(doc || { _id: 'backup_settings', enabled: false, intervalMinutes: 60, folderPath: '', lastRunAt: null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load settings', error: err.message });
  }
});

// POST /api/backup/settings -> save and (re)start scheduler
router.post('/settings', async (req, res) => {
  try {
    const { enabled, intervalMinutes, folderPath } = req.body || {};
    const update = {
      enabled: !!enabled,
      intervalMinutes: Math.max(1, Number(intervalMinutes || 60)),
      folderPath: String(folderPath || ''),
    };
    const saved = await BackupSettings.findByIdAndUpdate('backup_settings', update, { new: true, upsert: true });
    startScheduler(saved);
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: 'Failed to save settings', error: err.message });
  }
});

/*
  POST /api/backup/restore
  Accepts JSON (same structure as export) and replaces data in collections.
*/
// DELETE /api/backup - Danger! Deletes all non-system collections
router.delete('/', async (req, res) => {
  try {
    const names = await getCollectionNames();
    for (const name of names) {
      await mongoose.connection.db.collection(name).deleteMany({});
    }
    res.json({ message: 'All data deleted' });
  } catch (err) {
    console.error('Delete all data failed:', err);
    res.status(500).json({ message: 'Failed to delete data', error: err.message });
  }
});

router.post('/restore', async (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ message: 'Invalid backup data' });
    }

    // Iterate collections without transactions (stand-alone MongoDB deployments don’t support them)
    for (const [name, docs] of Object.entries(data)) {
      const col = mongoose.connection.db.collection(name);
      await col.deleteMany({});
      if (Array.isArray(docs) && docs.length > 0) {
        // Convert _id strings back to ObjectId where necessary
        const transformed = docs.map((d) => {
          if (d._id) {
            // Case 1: plain hex string
            if (typeof d._id === 'string') {
              if (Types.ObjectId.isValid(d._id)) {
                d._id = new Types.ObjectId(d._id);
              }
            }
            // Case 2: $oid wrapper produced by EJSON
            else if (typeof d._id === 'object' && d._id.$oid && typeof d._id.$oid === 'string') {
              if (Types.ObjectId.isValid(d._id.$oid)) {
                d._id = new Types.ObjectId(d._id.$oid);
              }
            }
            // Case 3: Raw BSON object from JSON.stringify on driver ObjectId
            else if (typeof d._id === 'object' && d._id._bsontype === 'ObjectId' && Array.isArray(d._id.id)) {
              // Convert byte array to Buffer -> ObjectId
              const buf = Buffer.from(d._id.id);
              d._id = new Types.ObjectId(buf);
            }
          }
          return d;
        });
        try {
          await col.insertMany(transformed, { ordered: false }); // continue on dup errors
        } catch (bulkErr) {
          if (bulkErr && bulkErr.code === 11000) {
            console.warn(`Duplicate key errors ignored for collection ${name}`);
          } else {
            throw bulkErr; // rethrow other errors
          }
        }
      }
    }
    // After restore, ensure default admin users exist across modules (if backups didn't include them)
    try {
      const HospitalUser = require('../models/User');
      const PharmacyUser = require('../Pharmacy  models/User');
      let FinanceUser = null; try { FinanceUser = require('../models/FinanceUser'); } catch {}
      let LabUser = null; try { LabUser = require('../lab_dist/lab models/User'); } catch {}

      // Hospital admin
      try {
        const hospitalAdminUsername = 'admin';
        const exists = await HospitalUser.findOne({ username: hospitalAdminUsername });
        if (!exists) {
          await HospitalUser.create({ name: 'Admin', username: hospitalAdminUsername, password: '123', role: 'admin' });
        }
      } catch {}

      // Pharmacy admin
      try {
        const pharmacyAdminUsername = 'admin';
        const exists = await PharmacyUser.findOne({ username: pharmacyAdminUsername });
        if (!exists) {
          await PharmacyUser.create({ username: pharmacyAdminUsername, password: '123', role: 'admin' });
        }
      } catch {}

      // Finance admin (optional)
      try {
        if (FinanceUser) {
          const exists = await FinanceUser.findOne({ username: 'admin' });
          if (!exists) {
            const crypto = require('crypto');
            const sha256 = (s)=> crypto.createHash('sha256').update(String(s)).digest('hex');
            await FinanceUser.create({ username: 'admin', passwordHash: sha256('123'), role: 'finance' });
          }
        }
      } catch {}

      // Lab admin (optional)
      try {
        if (LabUser) {
          const exists = await LabUser.findOne({ username: 'admin' });
          if (!exists) {
            await LabUser.create({ username: 'admin', password: '123', role: 'admin' });
          }
        }
      } catch {}
    } catch {}

    // Post-restore migration: if Pharmacy collection 'pharmacy_expense' is empty but legacy hospital 'expenses' has docs,
    // copy them into pharmacy schema so Pharmacy UI shows data for older backups.
    try {
      const db = mongoose.connection.db;
      const phCol = db.collection('pharmacy_expense');
      const hospCol = db.collection('expenses');
      const phCount = await phCol.countDocuments();
      const hospCount = await hospCol.countDocuments();
      if (phCount === 0 && hospCount > 0) {
        const docs = await hospCol.find({}).toArray();
        const mapped = docs.map(d => ({
          // preserve original _id mapping to avoid duplicates only if not colliding with pharmacy schema
          // create new _id to avoid conflicts since schemas differ
          type: d.category || 'Other',
          notes: d.title || '',
          description: d.title || '',
          amount: Number(d.amount) || 0,
          date: d.date ? new Date(d.date) : new Date(),
          createdAt: new Date(),
        }));
        if (mapped.length) {
          await phCol.insertMany(mapped, { ordered: false });
          console.log(`[backup:restore] Migrated ${mapped.length} hospital expenses -> pharmacy_expense`);
        }
      }
    } catch (migrateErr) {
      console.warn('[backup:restore] expense migration skipped/failed:', migrateErr?.message || migrateErr);
    }

    res.json({ message: 'Database restored successfully' });
  } catch (err) {
    console.error('Backup restore failed:', err);
    res.status(500).json({ message: 'Failed to restore backup', error: err.message });
  }
});

module.exports = router;