// Seed default Pharmacy admin into the hospital DB (pharmacyusers collection)
require('dotenv').config();
const mongoose = require('mongoose');
const PharmacyUser = require('../Pharmacy  models/User');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.HOSPITAL_MONGO_URI ||
  'mongodb://127.0.0.1:27017/hospital';

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[hospital-db] connected');

    const username = 'admin1';
    const password = 'admin123';
    const role = 'admin';

    const existing = await PharmacyUser.findOne({ username });
    if (existing) {
      console.log(`[pharmacyusers] User '${username}' already exists (id=${existing._id}).`);
    } else {
      const u = new PharmacyUser({ username, password, role });
      await u.save(); // hashes password via pre('save')
      console.log(`[pharmacyusers] Seeded default admin '${username}'.`);
    }
  } catch (e) {
    console.error('Seed error:', e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
