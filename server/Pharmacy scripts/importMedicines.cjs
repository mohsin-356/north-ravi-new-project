// backend/scripts/importMedicines.cjs
// Run with: node scripts/importMedicines.cjs
// This script uses CommonJS so it runs correctly under the backend where package.json is "type": "commonjs".

const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');

const Medicine = require('../models/medicine');

// Locate the Excel file (source/public/medicines.xlsx)
const filePath = path.join(__dirname, '..', '..', 'public', 'medicines.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/hospital');
    console.log('✅ Connected to MongoDB');

    for (const row of data) {
      const name = row['Medicine Name'];
      if (!name) continue;
      try {
        await Medicine.create({ name });
        console.log(`✅ Inserted: ${name}`);
      } catch (err) {
        if (err.code === 11000) {
          console.log(`⚠️ Duplicate: ${name}`);
        } else {
          console.error(`❌ Failed to insert ${name}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
})();
