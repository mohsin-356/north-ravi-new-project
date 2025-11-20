const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const expenseDepartmentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ExpenseDepartment || mongoose.model('ExpenseDepartment', expenseDepartmentSchema);
