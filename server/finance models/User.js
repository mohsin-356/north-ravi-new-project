const mongoose = require('mongoose');

const FinanceUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'finance' },
}, { timestamps: true });

module.exports = mongoose.model('FinanceUser', FinanceUserSchema);
