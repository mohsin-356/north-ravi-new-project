const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const expenseSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String },
    expenseDepartmentId: { type: String, ref: 'ExpenseDepartment' },
    expenseDepartmentName: { type: String },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
