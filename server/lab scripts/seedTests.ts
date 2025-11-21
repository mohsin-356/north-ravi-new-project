/*
  Lab Tests Seeder
  - Reads JSON array from a file (default: server/lab scripts/data/tests.json)
  - Maps fields to Test model, including parameters with conventionalUnit + referenceRangeText
  - Attempts to parse numeric ranges when possible to fill normalRange {min,max}
  - Upserts by unique name (create if missing, update if exists)
*/

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');
dotenv.config();

// Import Mongoose model (TS)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Test from '../lab models/Test';

interface IncomingParameter {
  parameter?: string;
  unit?: string;
  conventionalUnit?: string;
  referenceRange?: string;
}

interface IncomingTestItem {
  name: string;
  category: string;
  description?: string;
  price?: number;
  sampleType?: string;
  fastingRequired?: boolean;
  parameters?: IncomingParameter[];
}

function parseReferenceRange(text?: string): {
  normalRange?: { min?: number; max?: number };
  referenceRangeText?: string | null;
} {
  if (!text) return { referenceRangeText: null };
  const s = String(text).trim();
  // Patterns: "A - B", "A to B", "< X", "> X", "-2 to +2"
  const num = '[-+]?\\d+(?:\\.\\d+)?';
  const rangeDash = new RegExp(`^\\s*(${num})\\s*(?:-|to)\\s*(${num})\\s*$`, 'i');
  const lt = new RegExp(`^\\s*<\\s*(${num})\\s*$`, 'i');
  const gt = new RegExp(`^\\s*>\\s*(${num})\\s*$`, 'i');

  // Extract first numeric pair anywhere in string if present (robust fallback)
  const anyTwoNumbers = new RegExp(`${num}.*?${num}`);

  let m = s.match(rangeDash);
  if (m) {
    const min = parseFloat(m[1]);
    const max = parseFloat(m[2]);
    if (!isNaN(min) && !isNaN(max)) return { normalRange: { min, max }, referenceRangeText: s };
  }
  m = s.match(lt);
  if (m) {
    const max = parseFloat(m[1]);
    if (!isNaN(max)) return { normalRange: { max }, referenceRangeText: s };
  }
  m = s.match(gt);
  if (m) {
    const min = parseFloat(m[1]);
    if (!isNaN(min)) return { normalRange: { min }, referenceRangeText: s };
  }
  if (anyTwoNumbers.test(s)) {
    try {
      const matches = s.match(new RegExp(num, 'g')) || [];
      if (matches.length >= 2) {
        const min = parseFloat(matches[0]);
        const max = parseFloat(matches[1]);
        if (!isNaN(min) && !isNaN(max)) return { normalRange: { min, max }, referenceRangeText: s };
      }
    } catch {}
  }
  return { referenceRangeText: s };
}

function normalizeSampleType(v?: string): 'blood' | 'urine' | 'other' {
  const s = (v || '').toString().trim().toLowerCase();
  if (s === 'blood' || s === 'urine') return s as any;
  return 'other';
}

function mapParameter(p: IncomingParameter): any {
  const base = parseReferenceRange(p.referenceRange);
  const obj: any = {
    id: uuidv4(),
    name: p.parameter || '',
    unit: p.unit || '',
    conventionalUnit: p.conventionalUnit || undefined,
    referenceRangeText: base.referenceRangeText ?? null,
  };
  if (base.normalRange && (typeof base.normalRange.min === 'number' || typeof base.normalRange.max === 'number')) {
    // Only attach keys that exist to keep document clean
    const nr: any = {};
    if (typeof base.normalRange.min === 'number') nr.min = base.normalRange.min;
    if (typeof base.normalRange.max === 'number') nr.max = base.normalRange.max;
    if (Object.keys(nr).length) obj.normalRange = nr;
  }
  return obj;
}

function mapTest(t: IncomingTestItem): any {
  const params = Array.isArray(t.parameters) ? t.parameters.map(mapParameter) : [];
  return {
    name: t.name?.toString().trim(),
    category: (t.category || '').toString().trim(),
    description: (t.description || t.name || '').toString().trim(),
    price: Number(t.price) || 0,
    sampleType: normalizeSampleType(t.sampleType),
    fastingRequired: !!t.fastingRequired,
    parameters: params,
  };
}

async function run() {
  const dataPathArg = process.argv[2];
  const defaultPath = path.resolve(__dirname, 'data', 'tests.json');
  const dataPath = dataPathArg ? path.resolve(process.cwd(), dataPathArg) : defaultPath;

  if (!fs.existsSync(dataPath)) {
    console.error(`[seed] Data file not found at: ${dataPath}`);
    console.error(`[seed] Please place your JSON array at: ${defaultPath} or pass a path argument.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  let arr: IncomingTestItem[] = [];
  try {
    arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error('JSON root is not an array');
  } catch (e: any) {
    console.error('[seed] Failed parsing JSON:', e?.message || e);
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.HOSPITAL_MONGO_URI || 'mongodb://127.0.0.1:27017/hospital';
  await mongoose.connect(mongoUri as any);
  console.log('[seed] Connected to MongoDB');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const t of arr) {
    try {
      if (!t?.name || !t?.category) { skipped++; continue; }
      const doc = mapTest(t);
      const existing = await Test.findOne({ name: doc.name });
      if (existing) {
        await Test.updateOne({ _id: existing._id }, { $set: doc });
        updated++;
      } else {
        await Test.create(doc as any);
        created++;
      }
    } catch (e: any) {
      console.warn(`[seed] Failed for test "${t?.name}":`, e?.message || e);
      skipped++;
    }
  }

  console.log(`[seed] Done. created=${created}, updated=${updated}, skipped=${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (e) => {
  console.error('[seed] Fatal error:', e?.stack || e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
