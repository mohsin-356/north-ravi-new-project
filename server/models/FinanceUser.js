const mongoose = require('mongoose');

const FinanceUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  role: { type: String, enum: ['finance', 'admin', 'viewer'], default: 'finance' },
  active: { type: Boolean, default: true },
  passwordHash: { type: String },
}, { timestamps: true, collection: 'financeusers' });

module.exports = mongoose.model('FinanceUser', FinanceUserSchema);
