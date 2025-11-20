const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  // Front-end sends `type` (category) and `notes` (description)
  type: { type: String, required: true, trim: true },
  notes: { type: String, trim: true },
  // Keep `description` for backward compatibility
  description: { type: String, trim: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'pharmacy_expense' });

module.exports = mongoose.models.PharmacyExpense || mongoose.model('PharmacyExpense', ExpenseSchema);
