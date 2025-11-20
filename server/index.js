require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

// nodemon touch 4: restart to pick up backup.ts import style fixes

const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const expenseDepartmentRoutes = require('./routes/expenseDepartmentRoutes');
const doctorLedgerRoutes = require('./routes/doctorLedgerRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const userRoutes = require('./routes/userRoutes');
// Hospital Staff Management routes (hospital module)
const staffRoutes = require('./routes/staff');
const attendanceRoutes = require('./routes/attendance');
const staffSettingsRoutes = require('./routes/staffSettings');

// Pharmacy routes (mounted into the same server)
const pharmacyAuditLogger = require('./Pharmacy middleware/auditLogger');
const pharmacyAddStockRoutes = require('./Pharmacy routes/addStock');
const pharmacyAnalyticsRoutes = require('./Pharmacy routes/analytics');
const pharmacyAuditLogsRoutes = require('./Pharmacy routes/auditLogs');
const pharmacyBackupRoutes = require('./Pharmacy routes/backup');
const pharmacyCreditRoutes = require('./Pharmacy routes/credit');
const pharmacyCustomerRoutes = require('./Pharmacy routes/customerRoutes'); 
const pharmacyExpenseRoutes = require('./Pharmacy routes/expenses');
const pharmacyInventoryRoutes = require('./Pharmacy routes/inventoryRoutes');
const pharmacyMedicineRoutes = require('./Pharmacy routes/medicineRoutes');
const pharmacyPurchaseRoutes = require('./Pharmacy routes/purchases');
const pharmacyReturnsRoutes = require('./Pharmacy routes/returns');
const pharmacySalesRoutes = require('./Pharmacy routes/sales');
const pharmacySettingsRoutes = require('./Pharmacy routes/settings'); 
const pharmacySupplierReturnsRoutes = require('./Pharmacy routes/supplierReturns');
const pharmacySupplierRoutes = require('./Pharmacy routes/supplierRoutes');
const pharmacyUserRoutes = require('./Pharmacy routes/userRoutes');
const pharmacyStaffRoutes = require('./Pharmacy routes/staffRoutes');
const pharmacyStaffSettingsRoutes = require('./Pharmacy routes/staffSettings');

// Indoor Pharmacy routes (duplicate namespace using same DB, isolated collections)
const indoorAddStockRoutes = require('./Indoor routes/addStock');
const indoorInventoryRoutes = require('./Indoor routes/inventoryRoutes');
const indoorMedicineRoutes = require('./Indoor routes/medicineRoutes');
const indoorPurchaseRoutes = require('./Indoor routes/purchases');
const indoorSalesRoutes = require('./Indoor routes/sales');
const indoorSupplierRoutes = require('./Indoor routes/supplierRoutes');
const indoorReturnsRoutes = require('./Indoor routes/returns');
const indoorSupplierReturnsRoutes = require('./Indoor routes/supplierReturns');
const indoorExpenseRoutes = require('./Indoor routes/expenses');
const indoorAnalyticsRoutes = require('./Indoor routes/analytics');
const indoorSettingsRoutes = require('./Indoor routes/settings');
const indoorUserRoutes = require('./Indoor routes/userRoutes');
const indoorAuditLogsRoutes = require('./Indoor routes/auditLogs');

const app = express();
// CORS: allow localhost in dev and Electron (file:// -> null origin) in production
const corsWhitelist = new Set([
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]);
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl or Electron file://)
    if (!origin) return callback(null, true);
    if (corsWhitelist.has(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
let isDbReady = false;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (corsWhitelist.has(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS (socket.io)'), false);
    },
    credentials: true,
  },
});

// Expose io instance to routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log('[socket] client connected', socket.id);

  socket.on('disconnect', () => {
    console.log('[socket] client disconnected', socket.id);
  });
});

// Try to enable TS runtime for Lab routes/models if ts-node is installed
let tsNodeEnabled = false;
try {
  require('ts-node').register({ transpileOnly: true });
  tsNodeEnabled = true;
  console.log('[server] ts-node registered for TypeScript lab routes');
} catch (_) {
  console.warn('[server] ts-node not found; Lab TS routes will not be mounted. Install dev dep in server: npm --prefix server i -D ts-node typescript');
}

// Guard requests until DB ready (allow health endpoints)
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/api/health') return next();
  if (!isDbReady) return res.status(503).json({ ok: false, message: 'Database not ready' });
  next();
});

// Register routes
// Pharmacy audit logger (only logs entities it knows; safe to mount at /api)
app.use('/api', pharmacyAuditLogger);
try {
  const auditRoutes = require('./routes/audit');
  app.use('/api/audit', auditRoutes);
  console.log('[server] Audit routes mounted under /api/audit');
} catch (e) {
  console.warn('[server] Audit routes not mounted:', e?.message || e);
}
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/expense-departments', expenseDepartmentRoutes);
app.use('/api/doctor-ledger', doctorLedgerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
// Corporate panel routes fully removed
// Hospital Staff Management routes (hospital module)
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/hospital/staff-settings', staffSettingsRoutes);

// Overview route (monthly patients/tokens/revenue)
try {
  const overviewRoutes = require('./routes/overviewRoutes');
  app.use('/api/overview', overviewRoutes);
  console.log('[server] Overview routes mounted under /api/overview');
} catch (e) {
  console.warn('[server] Overview routes not mounted:', e?.message || e);
}

// Finance routes (auth + summary + users)
try {
  const financeAuthRoutes = require('./finance routes/auth');
  const financeSummaryRoutes = require('./finance routes/summary');
  const financeUsersRoutes = require('./routes/financeUsers');
  app.use('/api/finance/auth', financeAuthRoutes);
  app.use('/api/finance/summary', financeSummaryRoutes);
  app.use('/api/finance/users', financeUsersRoutes);
  console.log('[server] Finance routes mounted under /api/finance (including users)');
} catch (e) {
  console.error('[server] Failed mounting Finance routes:', e?.stack || e);
}

// Mount Pharmacy routes under /api
app.use('/api/add-stock', pharmacyAddStockRoutes);
app.use('/api/analytics', pharmacyAnalyticsRoutes);
app.use('/api/audit-logs', pharmacyAuditLogsRoutes);
app.use('/api/backup', pharmacyBackupRoutes);
app.use('/api/credit', pharmacyCreditRoutes);
app.use('/api/pharmacy/customers', pharmacyCustomerRoutes); // avoid conflict with hospital patients/customers if any
app.use('/api/pharmacy/expenses', pharmacyExpenseRoutes);
app.use('/api/inventory', pharmacyInventoryRoutes);
app.use('/api/medicines', pharmacyMedicineRoutes);
app.use('/api/purchases', pharmacyPurchaseRoutes);
app.use('/api/returns', pharmacyReturnsRoutes);
app.use('/api/sales', pharmacySalesRoutes);
app.use('/api/pharmacy/settings', pharmacySettingsRoutes);
app.use('/api/supplier-returns', pharmacySupplierReturnsRoutes);
app.use('/api/suppliers', pharmacySupplierRoutes);
app.use('/api/pharmacy/users', pharmacyUserRoutes);
app.use('/api/pharmacy/staff', pharmacyStaffRoutes);
app.use('/api/staff-settings', pharmacyStaffSettingsRoutes);

// Mount Indoor Pharmacy routes under /api/indoor/*
app.use('/api/indoor/add-stock', indoorAddStockRoutes);
app.use('/api/indoor/inventory', indoorInventoryRoutes);
app.use('/api/indoor/medicines', indoorMedicineRoutes);
app.use('/api/indoor/purchases', indoorPurchaseRoutes);
app.use('/api/indoor/sales', indoorSalesRoutes);
app.use('/api/indoor/suppliers', indoorSupplierRoutes);
app.use('/api/indoor/returns', indoorReturnsRoutes);
app.use('/api/indoor/supplier-returns', indoorSupplierReturnsRoutes);
app.use('/api/indoor/expenses', indoorExpenseRoutes);
app.use('/api/indoor/analytics', indoorAnalyticsRoutes);
app.use('/api/indoor/settings', indoorSettingsRoutes);
app.use('/api/indoor/users', indoorUserRoutes);
app.use('/api/indoor/audit-logs', indoorAuditLogsRoutes);

// Mount Lab routes with robust per-module loading
try {
  const path = require('path');
  const fs = require('fs');

  // Collect debug info for lab module resolution
  const labDebug = [];

  function safeLoadLab(name) {
    try {
      if (tsNodeEnabled) {
        const modTs = require(path.join(__dirname, 'lab routes', name + '.ts'));
        return modTs?.default || modTs;
      }

      // Try multiple candidate locations for compiled JS.
      // Prefer unpacked locations first so we can ship hotfixes by copying files there.
      const candidates = [
        // Unpacked (preferred)
        (process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'lab_dist', 'lab routes', name + '.js') : null),
        (process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'lab_dist', 'lab_routes', name + '.js') : null),
        // Asar path (fallback)
        path.join(__dirname, 'lab_dist', 'lab routes', name + '.js'),
        path.join(__dirname, 'lab_dist', 'lab_routes', name + '.js'),
      ].filter(Boolean);

      let lastErr = null;
      const exists = candidates.map(p => ({ path: p, exists: fs.existsSync(p) }));
      let chosen = null;
      const attempts = [];
      for (const p of candidates) {
        try {
          const mod = require(p);
          if (mod) {
            chosen = p;
            const resolved = mod?.default || mod;
            labDebug.push({ name, candidates: exists, chosen, attempts });
            return resolved;
          }
        } catch (err) {
          lastErr = err;
          attempts.push({ pathTried: p, error: String(err?.message || err) });
        }
      }

      labDebug.push({ name, candidates: exists, chosen: null, error: String(lastErr || 'not found'), attempts });
      throw lastErr || new Error('Lab route not found in candidates');
    } catch (e) {
      console.error(`[server] Lab module "${name}" failed to load:`, e?.message || e);
      try { labDebug.push({ name, error: e?.message || String(e) }); } catch {}
      return null;
    }
  }

  const mounted = [];

  const labAuth = safeLoadLab('auth');
  if (labAuth) {
    app.use('/api/lab/auth', labAuth);
    app.use('/api/labtech/auth', labAuth); // backward-compatible alias
    mounted.push('auth');
  }

  const labDashboard = safeLoadLab('dashboard');
  if (labDashboard) { app.use('/api/lab/dashboard', labDashboard); mounted.push('dashboard'); }

  const labFinance = safeLoadLab('finance');
  if (labFinance) { app.use('/api/lab/finance', labFinance); mounted.push('finance'); }

  const labInventory = safeLoadLab('inventory');
  if (labInventory) { app.use('/api/lab/inventory', labInventory); mounted.push('inventory'); }

  const labSuppliers = safeLoadLab('suppliers');
  if (labSuppliers) { app.use('/api/lab/suppliers', labSuppliers); mounted.push('suppliers'); }

  const labLabtech = safeLoadLab('labtech');
  if (labLabtech) { app.use('/api/labtech', labLabtech); mounted.push('labtech'); }

  const labNotification = safeLoadLab('notification');
  if (labNotification) { app.use('/api/lab/notifications', labNotification); mounted.push('notification'); }

  const labPatient = safeLoadLab('patient');
  if (labPatient) { app.use('/api/lab/patients', labPatient); mounted.push('patient'); }

  const labReport = safeLoadLab('report');
  if (labReport) { app.use('/api/lab/reports', labReport); mounted.push('report'); }

  const labSettings = safeLoadLab('settings');
  if (labSettings) { app.use('/api/lab/settings', labSettings); mounted.push('settings'); }

  const labStaff = safeLoadLab('staff');
  if (labStaff) { app.use('/api/lab/staff', labStaff); mounted.push('staff'); }

  const labAttendance = safeLoadLab('attendance');
  if (labAttendance) { app.use('/api/lab/attendance', labAttendance); mounted.push('attendance'); }

  const labStaffSettings = safeLoadLab('staffSettings');
  if (labStaffSettings) { app.use('/api/lab/staff-settings', labStaffSettings); mounted.push('staff-settings'); }

  const labBackup = safeLoadLab('backup');
  if (labBackup) { app.use('/api/lab/backup', labBackup); mounted.push('backup'); }

  const labUsers = safeLoadLab('users');
  if (labUsers) { app.use('/api/lab/users', labUsers); mounted.push('users'); }

  const labAudit = safeLoadLab('audit');
  if (labAudit) { app.use('/api/lab/audit', labAudit); mounted.push('audit'); }

  // Lab referrals removed

  if (mounted.length > 0) {
    console.log('[server] Lab routes mounted:', mounted.join(', '));
  } else {
    console.warn('[server] No Lab routes mounted. Check that server/lab_dist exists in the installed app and contains compiled JS.');
  }

  // Expose debug endpoint for lab route resolution
  try {
    app.get('/api/lab/_debug', (_req, res) => {
      res.json({ mounted, labDebug });
    });
    console.log('[server] Lab debug endpoint mounted at /api/lab/_debug');
  } catch {}
} catch (err) {
  console.warn('[server] Unexpected error while mounting Lab routes:', err?.message || err);
}

// Health checks
app.get('/health', (_, res) => res.status(isDbReady ? 200 : 503).json({ ok: isDbReady }));
app.get('/api/health', (_, res) => res.status(isDbReady ? 200 : 503).json({ ok: isDbReady }));

const PORT = process.env.PORT || 5000;

// Connection status + retry
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.HOSPITAL_MONGO_URI || 'mongodb://127.0.0.1:27017/hospital';
mongoose.connection.on('connected', async () => {
  isDbReady = true; 
  console.log('[hospital-db] connected');
  try {
    // Ensure Lab collections exist (TS models can't be required directly here)
    await ensureLabCollections();

    // Ensure indexes reflect latest schema (esp. for Bed partial indexes)
    const Patient = require('./models/Patient');
    // Apply latest Patient indexes (partial unique index on mrNumber)
    await Patient.syncIndexes();
    console.log('[hospital-db] Patient indexes synced');

    // Pharmacy Inventory indexes (speed up POS search)
    try {
      const PharmacyInventory = require('./Pharmacy  models/Inventory');
      await PharmacyInventory.syncIndexes();
      console.log('[pharmacy-db] Inventory indexes synced');
    } catch (e) {
      console.warn('[pharmacy-db] Failed to sync Inventory indexes:', e?.message || e);
    }

    // Ensure default admin users exist for Hospital and Pharmacy
    try {
      const HospitalUser = require('./models/User');
      const PharmacyUser = require('./Pharmacy  models/User');

      // Hospital admin
      const hospitalAdminUsername = 'admin';
      const hospitalAdmin = await HospitalUser.findOne({ username: hospitalAdminUsername });
      if (!hospitalAdmin) {
        await HospitalUser.create({
          name: 'Admin',
          username: hospitalAdminUsername,
          password: '123',
          role: 'admin',
        });
        console.log('[seed] Created default Hospital admin (username: admin / pass: 123)');
      } else {
        console.log('[seed] Hospital admin exists');
      }

      // Pharmacy admin
      const pharmacyAdminUsername = 'admin';
      const pharmacyAdmin = await PharmacyUser.findOne({ username: pharmacyAdminUsername });
      if (!pharmacyAdmin) {
        await PharmacyUser.create({
          username: pharmacyAdminUsername,
          password: '123',
          role: 'admin',
        });
        console.log('[seed] Created default Pharmacy admin (username: admin / pass: 123)');
      } else {
        console.log('[seed] Pharmacy admin exists');
      }
    } catch (seedErr) {
      console.warn('[seed] Failed to ensure default admins:', seedErr?.message || seedErr);
    }
  } catch (e) {
    console.warn('[hospital-db] Failed to sync Bed indexes:', e?.message || e);
  }
});
mongoose.connection.on('error', (err) => { isDbReady = false; console.error('[hospital-db] error:', err?.message || err); });
mongoose.connection.on('disconnected', () => { isDbReady = false; console.warn('[hospital-db] disconnected'); });

async function connectWithRetry(retryMs = 3000){
  try {
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  } catch (err) {
    console.error('[hospital-db] initial connect failed, retrying in', retryMs, 'ms');
    setTimeout(() => connectWithRetry(Math.min(retryMs * 1.5, 15000)), retryMs);
  }
}
connectWithRetry();

server.listen(PORT, () => console.log(`[hospital] Server (with Socket.IO) running on port ${PORT}`));

// Create Lab collections if they don't exist yet. This is safe and idempotent.
async function ensureLabCollections(){
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    // Default Mongoose pluralization for Lab models (consistent with Hospital/Pharmacy)
    const desired = [
      'appointments',
      'attendances',
      'categories',
      'finances',
      'inventoryitems', // InventoryItem
      'notifications',
      'reports',
      'reporttemplates',
      'samples',
      'settings', // Setting model -> 'settings'
      'lab_settings',
      'lab_staff',
      'lab_attendances',
      'lab_staff_settings',
      'staffsettings',
      'tests',
      'testorders',
      'users',
      'lab_users',
      'lab_audit_logs',
    ];
    const existing = await db.listCollections().toArray();
    const existingNames = new Set(existing.map(c => c.name));
    for (const name of desired){
      if (!existingNames.has(name)){
        try {
          await db.createCollection(name);
          console.log(`[lab] created collection: ${name}`);
        } catch (err){
          // If another process created it in the meantime, ignore NamespaceExists
          if (!String(err?.message || err).includes('NamespaceExists')){
            console.warn(`[lab] failed creating collection ${name}:`, err?.message || err);
          }
        }
      }
    }
  } catch (err){
    console.warn('[lab] ensureLabCollections error:', err?.message || err);
  }
}

