import { Router } from "express";
// Auth disabled for lab endpoints (open access)
import { body, validationResult } from "express-validator";
import Test from "../lab models/Test";
import { isValidObjectId } from "mongoose";
import InventoryItem from "../lab models/InventoryItem";
import * as path from "path";
import * as XLSX from "xlsx";
import Notification from "../lab models/Notification";
import { logAudit } from "../lab utils/audit";

const router = Router();

// No-op auth/role middleware
const allowAll = (_req: any, _res: any, next: any) => next();

// Public route to fetch master test list (no auth required)
router.get("/master-tests-public", (_req, res) => {
  res.json(masterTestsCache);
});

// ---------------- Master Test List (Excel) ----------------
// Load once on server start, so subsequent requests are fast
// Attempt to locate Excel file in several possible public folders
const candidatePaths = [
  // .xlsx first
  // project root public: from server/lab routes -> up 2 -> project -> public
  path.resolve(__dirname, "..", "..", "public", "lab_tests_500.xlsx"),
  // server/public
  path.resolve(__dirname, "..", "public", "lab_tests_500.xlsx"),
  // cwd variants
  path.resolve(process.cwd(), "..", "public", "lab_tests_500.xlsx"),
  path.resolve(process.cwd(), "public", "lab_tests_500.xlsx"),
  // .csv fallback
  path.resolve(__dirname, "..", "..", "public", "lab_tests_500.csv"),
  path.resolve(__dirname, "..", "public", "lab_tests_500.csv"),
  path.resolve(process.cwd(), "..", "public", "lab_tests_500.csv"),
  path.resolve(process.cwd(), "public", "lab_tests_500.csv")
];
let excelPath = "";
let masterTestsCache: any[] = [];
for (const p of candidatePaths) {
  try {
    const workbook = XLSX.readFile(p);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    masterTestsCache = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    excelPath = p;
    console.log(`[LabTechRoute] Loaded ${masterTestsCache.length} master tests from ${p}`);
    break;
  } catch (e) {
    // continue
  }
}
if (!masterTestsCache.length) {
  console.error("[LabTechRoute] Could not load any master tests. Checked paths:", candidatePaths);
}


// Auth disabled: do not require JWT for labtech routes

// Example: get pending tests (read-only for all lab roles)
router.get("/tests/pending", allowAll, async (_req, res) => {
  // TODO: fetch tests from DB
  res.json([]);
});

// List all tests
// Serve full master list (used for datalist suggestions) — readable by all lab roles
router.get("/master-tests", allowAll, (_req, res) => {
  res.json(masterTestsCache);
});

// List tests — readable by all lab roles (supports pagination + filters)
router.get("/tests", allowAll, async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    const category = (req.query.category as string) || "";
    const hasPaging = typeof req.query.page !== 'undefined' || typeof req.query.limit !== 'undefined' || !!q || !!category;

    const filter: any = {};
    if (q && q.trim()) {
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(esc(q.trim()), 'i');
      filter.$or = [
        { name: rx },
        { category: rx },
        { description: rx },
        { sampleType: rx },
      ];
    }
    if (category && category !== 'all') filter.category = category;

    if (!hasPaging) {
      const list = await Test.find(filter).sort({ name: 1 });
      res.json(list);
      return;
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Test.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Test.countDocuments(filter),
    ]);

    res.json({ data: items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error('[GET /api/labtech/tests] error', err);
    res.status(500).json({ message: 'Failed to fetch tests' });
  }
});

// (Removed duplicate GET /tests/:id handler; see unified handler below)

// Create new test — restricted to lab technicians only
router.post(
  "/tests",
  allowAll,
  [
    body("category").notEmpty(),
    body("description").notEmpty(),
    body("price").isFloat({ min: 0 }),
    body("sampleType").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      // Accept full payload including parameters
      const payload = req.body || {};
      const test = await Test.create(payload);
      // Best-effort notification for lab staff
      try {
        await Notification.create({
          title: "New Test Added",
          message: `${test.name} added to catalog` as any,
          type: "success",
          category: "tests",
          userRole: "labTech",
        } as any);
      } catch (e) {
        console.warn("[Notifications] Failed to create test add notification", e);
      }
      await logAudit(req, "create_test", "LabTest", {
        id: (test as any)._id,
        name: (test as any).name,
        category: (test as any).category,
      });
      res.status(201).json(test);
      return;
    } catch (err) {
      res.status(500).json({ message: "Failed to create test" });
      return;
    }
  }
);

// Update test — restricted to lab technicians only
router.put("/tests/:id", allowAll, async (req, res) => {
  try {
    // Accept full payload including parameters
    const payload = req.body || {};
    const updated = await Test.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) {
      res.status(404).json({ message: "Test not found" });
      return;
    }
    await logAudit(req, "update_test", "LabTest", {
      id: (updated as any)._id,
      name: (updated as any).name,
      category: (updated as any).category,
    });
    res.json(updated);
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to update test" });
    return;
  }
});

// Delete test — restricted to lab technicians only
router.delete("/tests/:id", allowAll, async (req, res) => {
  try {
    const removed = await Test.findByIdAndDelete(req.params.id);
    if (!removed) {
      res.status(404).json({ message: "Test not found" });
      return;
    }
    await logAudit(req, "delete_test", "LabTest", {
      id: (removed as any)._id,
      name: (removed as any).name,
      category: (removed as any).category,
    });
    res.json({});
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to delete test" });
    return;
  }
});

// ----------------- Appointment Management -----------------
import Appointment from "../lab models/Appointment";
import Report from "../lab models/Report";

// List all appointments (optionally filter by date/status)
router.get("/appointments", allowAll, async (_req, res) => {
  try {
    const list = await Appointment.find().sort({ createdAt: -1 });
    res.json(list);
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch appointments" });
    return;
  }
});

// Create a new appointment
router.post(
  "/appointments",
  allowAll,
  [
    body("patientName").notEmpty(),
    body("patientPhone").notEmpty(),
    body("date").notEmpty(),
    body("time").notEmpty(),
    body("type").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const payload = req.body || {};
      // Normalize date to Date object if string
      if (payload.date && typeof payload.date === "string") {
        payload.date = new Date(payload.date);
      }
      const appt = await Appointment.create(payload);
      await logAudit(req, "create_appointment", "LabAppointment", {
        id: (appt as any)._id,
        patientName: (appt as any).patientName,
        date: (appt as any).date,
        time: (appt as any).time,
        type: (appt as any).type,
      });
      res.status(201).json(appt);
      return;
    } catch (err) {
      console.error("[LabTech] Create appointment error:", err);
      const msg = (err as any)?.message || "Failed to create appointment";
      res.status(500).json({ message: msg });
      return;
    }
  }
);

// Get single appointment (for demographics/report backfill)
router.get("/appointments/:id", allowAll, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    res.json(appt);
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch appointment" });
    return;
  }
});

// Create sample for appointment and mark in-progress
router.post("/appointments/:id/samples", allowAll, async (req, res) => {
  try {
    const { tests, guardianRelation, guardianName, cnic, phone, age, gender, address, discount: discountRaw } = req.body as any;
    if (!Array.isArray(tests) || tests.length === 0) {
      res.status(400).json({ message: "tests array required" });
      return;
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }

    // Normalize incoming tests: accept IDs or names
    const rawVals: string[] = tests
      .map((t: any) => (typeof t === "string" ? t : t?._id || t?.id || t?.name))
      .filter((v: any) => typeof v === "string" && v.trim().length > 0)
      .map((s: string) => s.trim());

    if (rawVals.length === 0) {
      res.status(400).json({ message: "No valid tests provided" });
      return;
    }

    const isHex24 = (s: string) => /^[a-f\d]{24}$/i.test(s);
    const idStrings = rawVals.filter(isHex24);
    const nameStrings = rawVals.filter(v => !isHex24(v));

    // helper to escape regex meta
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const nameOrClauses = nameStrings.map(n => ({ name: { $regex: new RegExp(`^${esc(n)}$`, "i") } }));

    // fetch tests to compute amount
    const query: any = { $or: [] as any[] };
    if (idStrings.length) query.$or.push({ _id: { $in: idStrings } });
    if (nameOrClauses.length) query.$or.push(...nameOrClauses);
    const testDocs = await Test.find(query.$or.length ? query : { _id: null });
    if (testDocs.length === 0) {
      res.status(400).json({ message: "No matching tests found" });
      return;
    }
    const totalAmount = testDocs.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    const discount = Math.max(0, Number(discountRaw) || 0);
    const netAmount = Math.max(0, totalAmount - discount);
    // Debug logs to diagnose zero totals
    console.log("[Create Sample] appointment:", req.params.id);
    console.log("[Create Sample] requested raw tests:", tests);
    console.log("[Create Sample] normalized inputs:", rawVals);
    console.log("[Create Sample] split ids:", idStrings, "names:", nameStrings);
    console.log("[Create Sample] found tests:", testDocs.map(t => ({ id: (t as any)._id?.toString?.(), name: t.name, price: t.price })));
    console.log("[Create Sample] computed totalAmount:", totalAmount);

    if (totalAmount === 0) {
      console.warn("[Create Sample] totalAmount is 0. Proceeding due to free tests or missing prices.");
    }

    // Compute next sample number (global) and daily token number ddMMyyyy_N
    // Note: simple counters acceptable for this context
    let sampleNumber: number | undefined = undefined;
    try {
      const current = await Sample.countDocuments({});
      sampleNumber = current + 1;
    } catch (e) {
      console.warn("[Create Sample] failed to compute sampleNumber via count", e);
    }
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const dayKey = `${dd}${mm}${yyyy}`; // ddMMyyyy
    // Count samples created today to make token suffix
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let tokenSuffix = 1;
    try {
      const todays = await Sample.countDocuments({ createdAt: { $gte: start, $lte: end } });
      tokenSuffix = todays + 1;
    } catch {}
    const token = `${dayKey}_${tokenSuffix}`;

    const sample = await Sample.create({
      patientName: appointment.patientName,
      phone: phone || (appointment as any).patientPhone || "N/A",
      // carry forward demographics for ResultEntry auto-selection (email removed)
      age: (typeof age !== 'undefined' && age !== null && String(age).trim() !== '') ? String(age) : (() => {
        const pa = (appointment as any).patientAge;
        if (pa === undefined || pa === null) return undefined;
        if (typeof pa === "number" && !isNaN(pa)) return String(pa);
        if (typeof pa === "string") {
          const trimmed = pa.trim();
          return trimmed.length ? trimmed : undefined;
        }
        return undefined;
      })(),
      gender: gender || (appointment as any).patientGender || undefined,
      address: address || (appointment as any).patientAddress || undefined,
      guardianRelation: guardianRelation || undefined,
      guardianName: guardianName || undefined,
      cnic: cnic || undefined,
      tests: testDocs.map(d => (d as any)._id),
      totalAmount,
      discount,
      netAmount,
      appointmentId: appointment._id,
      status: "received",
      sampleNumber,
      token,
    });

    appointment.status = "In-Progress";
    // link sample id
    (appointment as any).sampleId = sample._id;
    await appointment.save();

    await logAudit(req, "create_sample_for_appointment", "LabSample", {
      sampleId: (sample as any)._id,
      appointmentId: (appointment as any)._id,
      patientName: (appointment as any).patientName,
      tests: testDocs.map(t => ({ id: (t as any)._id, name: (t as any).name })),
      totalAmount,
      discount,
      netAmount,
      token,
    });

    res.status(201).json({ appointment, sample });
    return;
  } catch (err) {
    console.error("Error creating sample for appointment", req.params.id, err);
    res.status(500).json({ message: "Failed to create sample" });
    return;
  }
});

// Get single test with parameters (accepts ObjectId OR name fallback)
router.get("/tests/:id", allowAll, async (req, res) => {
  try {
    const raw = String(req.params.id || "").trim();
    let test = null as any;
    try {
      if (raw && isValidObjectId(raw)) {
        test = await Test.findById(raw);
      }
    } catch {}
    if (!test && raw) {
      // fallback by exact name, then case-insensitive match
      test = await Test.findOne({ name: raw });
      if (!test) {
        const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(`^${esc}$`, 'i');
        test = await Test.findOne({ name: rx });
      }
    }
    if (!test) {
      res.status(404).json({ message: "Test not found" });
      return;
    }
    res.json(test);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch test" });
    return;
  }
});

// Update sample results or interpretation (auto status transitions)
router.put("/samples/:id", allowAll, async (req, res) => {
  try {
    const { results, interpretation, status } = req.body || {};

    const sample = await Sample.findById(req.params.id);
    if (!sample) {
      res.status(404).json({ message: "Sample not found" });
      return;
    }

    const update: any = {};
    const hasResultsInPayload = Array.isArray(results) && results.length > 0;

    if (hasResultsInPayload) update.results = results;
    if (interpretation !== undefined) update.interpretation = interpretation;

    // Only allow explicit transition to 'completed' from front-end; ignore other statuses
    if (status === "completed") {
      const willHaveResults = hasResultsInPayload || (sample.results && sample.results.length > 0);
      if (!willHaveResults) {
        res.status(400).json({ message: "Cannot complete without results" });
        return;
      }
      update.status = "completed";
    } else if (!status && hasResultsInPayload && sample.status === "received") {
      // Auto move to processing on first results save
      update.status = "processing";
    }

    const updated = await Sample.findByIdAndUpdate(req.params.id, update, { new: true });

    // On completion, create notifications for admin (labTech audience) and patient
    if (update.status === "completed") {
      try {
        if (sample.appointmentId) {
          const appointment = await Appointment.findById(sample.appointmentId);
          if (appointment) {
            await Notification.create([
              {
                title: "Report Submitted",
                message: `Patient ${appointment.patientName} report submitted`,
                type: "success",
                category: "results",
                userRole: "labTech",
              },
              {
                title: "Your Report is Ready",
                message: "Your test results are now available",
                type: "success",
                category: "results",
                recipientId: appointment.patientId as any,
              },
            ] as any);
          }
        }
      } catch (notifyErr) {
        console.error("[Notifications] Failed to create on completion", notifyErr);
      }
    }

    await logAudit(req, "update_sample", "LabSample", {
      id: (updated as any)?._id || req.params.id,
      status: update.status || (updated as any)?.status,
      hasResults: Array.isArray(results) && results.length > 0,
    });

    res.json(updated);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update sample" });
    return;
  }
});

// Mark sample intake (start in-progress)
router.put("/appointments/:id/sample-intake", allowAll, async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: "Sample Collected", sampleTakenAt: new Date() },
      { new: true }
    );
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    await logAudit(req, "sample_intake", "LabAppointment", {
      id: (appt as any)._id,
      patientName: (appt as any).patientName,
      status: (appt as any).status,
    });
    res.json(appt);
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to update appointment" });
    return;
  }
});

// Finalize appointment with report
router.put("/appointments/:id/complete", allowAll, async (req, res) => {
  try {
    const { reportData } = req.body; // simple payload, adjust as needed
    // create report document
    const report = await Report.create(reportData || { patientAppointment: req.params.id });
    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: "completed", reportId: report._id },
      { new: true }
    );
    if (!updated) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    await logAudit(req, "complete_appointment", "LabAppointment", {
      appointmentId: (updated as any)._id,
      reportId: (report as any)._id,
      status: (updated as any).status,
    });
    res.json(updated);
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to finalize appointment" });
    return;
  }
});

// ----------------- Sample CRUD -----------------
import Sample from "../lab models/Sample";

// List samples (server-side pagination + optional filters)
router.get("/samples", allowAll, async (req, res) => {
  try {
    // Backward-compat: if no pagination params, return full list as before
    const hasPaging = typeof req.query.page !== 'undefined' || typeof req.query.limit !== 'undefined';

    // Build filter
    const filter: any = {};
    const status = (req.query.status as string) || undefined;
    if (status && status !== 'all') {
      if (status.includes(',')) {
        const parts = status.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length) (filter as any).status = { $in: parts };
      } else {
        (filter as any).status = status;
      }
    }

    const from = (req.query.from as string) || undefined; // yyyy-mm-dd
    const to = (req.query.to as string) || undefined;     // yyyy-mm-dd
    if (from || to) {
      filter.createdAt = {} as any;
      if (from) (filter.createdAt as any).$gte = new Date(`${from}T00:00:00`);
      if (to) (filter.createdAt as any).$lte = new Date(`${to}T23:59:59`);
    }

    const q = (req.query.q as string) || '';
    if (q && q.trim()) {
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(esc(q.trim()), 'i');
      filter.$or = [
        { patientName: rx },
        { patientId: rx },
        { phone: rx },
        { guardianName: rx },
        { token: rx },
        { cnic: rx },
      ];
    }

    const enrich = (tests: any[]) => {
      const parseRange = (s?: string) => {
        if (!s || typeof s !== 'string') return undefined;
        const m = s.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
        if (m) return { min: Number(m[1]), max: Number(m[2]) } as any;
        return undefined;
      };
      const norm = (s: string) => (s || '').toString().toLowerCase().replace(/\bhrs?\b/g,'hour').replace(/\b24\s*hours?\b/g,'24hour').replace(/\s+/g,' ').trim().replace(/[^a-z0-9]+/g,'');
      const score = (a: string, b: string) => {
        const na = norm(a), nb = norm(b);
        if (!na || !nb) return 0;
        if (na === nb) return 1.0;
        if (na.includes(nb) || nb.includes(na)) return 0.92;
        const ta = new Set(na.split(/\d+|[^a-z]+/).filter(Boolean));
        const tb = new Set(nb.split(/\d+|[^a-z]+/).filter(Boolean));
        if (!ta.size || !tb.size) return 0;
        let inter = 0; ta.forEach(t => { if (tb.has(t)) inter++; });
        const union = ta.size + tb.size - inter;
        return inter/union;
      };
      const byName = new Map<string, any[]>();
      (masterTestsCache || []).forEach((r: any) => {
        const tn = String(r.Test_Name || '').trim();
        if (!tn) return;
        const arr = byName.get(tn) || [];
        arr.push(r);
        byName.set(tn, arr);
      });
      return (Array.isArray(tests) ? tests : []).map((t: any) => {
        if (t && (!t.parameters || !t.parameters.length) && t.name) {
          let rows = byName.get(String(t.name)) || [];
          if (!rows.length) {
            // fuzzy: pick best group
            let bestName = '';
            let bestScore = 0;
            byName.forEach((_rows, tn) => {
              const sc = score(String(t.name), tn);
              if (sc > bestScore) { bestScore = sc; bestName = tn; }
            });
            if (bestScore >= 0.55) rows = byName.get(bestName) || [];
          }
          if (rows.length) {
            const params = rows.map((r: any) => {
              const pname = String(r.Parameter || '').trim();
              const unit = String(r.Unit || '').trim();
              const ref = (r.Reference_Range || r.Reference || '') as string;
              const nr = parseRange(ref);
              const o: any = { name: pname || t.name, unit };
              if (nr) o.normalRange = nr;
              if (r.Normal_Range_Male) o.normalRangeMale = r.Normal_Range_Male;
              if (r.Normal_Range_Female) o.normalRangeFemale = r.Normal_Range_Female;
              if (r.Normal_Range_Pediatric) o.normalRangePediatric = r.Normal_Range_Pediatric;
              return o;
            });
            return { ...t, parameters: params };
          }
        }
        return t;
      });
    };

    if (!hasPaging) {
      const list = await Sample.find(filter)
        .sort({ createdAt: -1 })
        .populate({ path: 'tests', select: 'name parameters' });
      const enriched = list.map((s: any) => {
        const obj = s.toObject ? s.toObject() : s;
        obj.tests = enrich(obj.tests || []);
        return obj;
      });
      res.json(enriched);
      return;
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Sample.find(filter)
        .sort({ createdAt: -1 })
        .populate({ path: 'tests', select: 'name parameters' })
        .skip(skip)
        .limit(limit),
      Sample.countDocuments(filter),
    ]);

    const enrichedItems = items.map((s: any) => {
      const obj = s.toObject ? s.toObject() : s;
      obj.tests = enrich(obj.tests || []);
      return obj;
    });
    res.json({ data: enrichedItems, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
    return;
  } catch (err) {
    console.error('[GET /api/labtech/samples] error', err);
    res.status(500).json({ message: "Failed to fetch samples" });
    return;
  }
});

// Get single sample (for report generation)
router.get("/samples/:id", allowAll, async (req, res) => {
  try {
    const s = await Sample.findById(req.params.id).populate({ path: 'tests', select: 'name parameters' });
    if (!s) return res.status(404).json({ message: "Sample not found" });

    const parseRange = (str?: string) => {
      if (!str || typeof str !== 'string') return undefined;
      const m = str.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
      if (m) return { min: Number(m[1]), max: Number(m[2]) } as any;
      return undefined;
    };
    const byName = new Map<string, any[]>();
    (masterTestsCache || []).forEach((r: any) => {
      const tn = String(r.Test_Name || '').trim();
      if (!tn) return;
      const arr = byName.get(tn) || [];
      arr.push(r);
      byName.set(tn, arr);
    });

    const obj = (s as any).toObject ? (s as any).toObject() : (s as any);
    const tests = Array.isArray(obj.tests) ? obj.tests : [];
    const norm = (s: string) => (s || '').toString().toLowerCase().replace(/\bhrs?\b/g,'hour').replace(/\b24\s*hours?\b/g,'24hour').replace(/\s+/g,' ').trim().replace(/[^a-z0-9]+/g,'');
    const score = (a: string, b: string) => {
      const na = norm(a), nb = norm(b);
      if (!na || !nb) return 0;
      if (na === nb) return 1.0;
      if (na.includes(nb) || nb.includes(na)) return 0.92;
      const ta = new Set(na.split(/\d+|[^a-z]+/).filter(Boolean));
      const tb = new Set(nb.split(/\d+|[^a-z]+/).filter(Boolean));
      if (!ta.size || !tb.size) return 0;
      let inter = 0; ta.forEach(t => { if (tb.has(t)) inter++; });
      const union = ta.size + tb.size - inter;
      return inter/union;
    };
    obj.tests = tests.map((t: any) => {
      if (t && (!t.parameters || !t.parameters.length) && t.name) {
        let rows = byName.get(String(t.name)) || [];
        if (!rows.length) {
          let bestName = '';
          let bestScore = 0;
          byName.forEach((_rows, tn) => {
            const sc = score(String(t.name), tn);
            if (sc > bestScore) { bestScore = sc; bestName = tn; }
          });
          if (bestScore >= 0.55) rows = byName.get(bestName) || [];
        }
        if (rows.length) {
          const params = rows.map((r: any) => {
            const pname = String(r.Parameter || '').trim();
            const unit = String(r.Unit || '').trim();
            const ref = (r.Reference_Range || r.Reference || '') as string;
            const nr = parseRange(ref);
            const o: any = { name: pname || t.name, unit };
            if (nr) o.normalRange = nr;
            if (r.Normal_Range_Male) o.normalRangeMale = r.Normal_Range_Male;
            if (r.Normal_Range_Female) o.normalRangeFemale = r.Normal_Range_Female;
            if (r.Normal_Range_Pediatric) o.normalRangePediatric = r.Normal_Range_Pediatric;
            return o;
          });
          return { ...t, parameters: params };
        }
      }
      return t;
    });

    res.json(obj);
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch sample" });
    return;
  }
});

// Create sample
router.post("/samples", allowAll, async (req, res) => {
  try {
    const payload = req.body || {};
    // Auto-assign sampleNumber if not provided
    if (!payload.sampleNumber) {
      try {
        const current = await Sample.countDocuments({});
        payload.sampleNumber = current + 1;
      } catch (e) {
        console.warn("[POST /samples] failed to compute sampleNumber via count", e);
      }
    }
    // Assign daily token ddMMyyyy_N if not provided
    if (!payload.token) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = String(now.getFullYear());
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      let suffix = 1;
      try { const todays = await Sample.countDocuments({ createdAt: { $gte: start, $lte: end } }); suffix = todays + 1; } catch {}
      payload.token = `${dd}${mm}${yyyy}_${suffix}`;
    }
    const sample = await Sample.create(payload);

    // If consumables are provided, decrement lab inventory quantities
    try {
      const list = Array.isArray(payload.consumables) ? payload.consumables : [];
      for (const c of list) {
        const id = (c && (c.item || c._id || c.id)) as string;
        const qty = Math.max(0, Number(c?.quantity) || 0);
        if (!id || !qty) continue;
        const item = await InventoryItem.findById(id);
        if (!item) continue;
        const next = Math.max(0, (item.currentStock || 0) - qty);
        await InventoryItem.findByIdAndUpdate(id, { currentStock: next, lastRestocked: new Date() });
      }
    } catch (e) {
      console.warn("[POST /samples] Failed to decrement inventory for consumables:", e);
    }

    await logAudit(req, "create_sample", "LabSample", {
      id: (sample as any)._id,
      patientName: (sample as any).patientName,
      token: (sample as any).token,
      totalAmount: (sample as any).totalAmount,
      discount: (sample as any).discount,
      netAmount: (sample as any).netAmount,
    });

    res.status(201).json(sample);
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to create sample" });
    return;
  }
});

// Delete sample
router.delete("/samples/:id", allowAll, async (req, res) => {
  try {
    const removed = await Sample.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: "Sample not found" });
    await logAudit(req, "delete_sample", "LabSample", {
      id: (removed as any)._id,
      patientName: (removed as any).patientName,
      token: (removed as any).token,
    });
    res.json({});
    return;
  } catch (err) {
    res.status(500).json({ message: "Failed to delete sample" });
    return;
  }
});

export default router;
