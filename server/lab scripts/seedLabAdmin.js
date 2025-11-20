// Seed default Lab user into lab_users collection
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load TS model using ts-node at runtime
require('ts-node').register({ transpileOnly: true });
const LabUser = require('../lab models/User').default || require('../lab models/User');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.HOSPITAL_MONGO_URI ||
  'mongodb://127.0.0.1:27017/hospital';

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[hospital-db] connected');

    const username = 'admin';
    const password = 'admin123';
    const role = 'labTech';

    const existing = await LabUser.findOne({ username });
    if (existing) {
      console.log(`[lab_users] User '${username}' already exists (id=${existing._id}).`);
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const userDoc = await LabUser.create({ username, passwordHash, role });
      console.log(`[lab_users] Seeded default lab user '${username}' (id=${userDoc._id}).`);
    }
  } catch (e) {
    console.error('Seed error:', e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
