// Seed default Finance user into the hospital DB (financeusers collection)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const FinanceUser = require('../finance models/User');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.HOSPITAL_MONGO_URI ||
  'mongodb://127.0.0.1:27017/hospital';

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[hospital-db] connected');

    const username = process.env.FINANCE_USERNAME || 'finance';
    const password = process.env.FINANCE_PASSWORD || 'finance123';

    let user = await FinanceUser.findOne({ username });
    if (user) {
      console.log(`[financeusers] User '${username}' already exists (id=${user._id}).`);
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await FinanceUser.create({ username, passwordHash, role: 'finance' });
      console.log(`[financeusers] Seeded default finance user '${username}'.`);
    }
  } catch (e) {
    console.error('Seed error:', e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
