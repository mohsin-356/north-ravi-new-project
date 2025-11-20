const mongoose = require('mongoose');

const IndoorExpenseSchema = new mongoose.Schema({
  type: { type: String, required: true, trim: true },
  notes: { type: String, trim: true },
  description: { type: String, trim: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'indoor_expense' });

module.exports = mongoose.models.IndoorExpense || mongoose.model('IndoorExpense', IndoorExpenseSchema);
