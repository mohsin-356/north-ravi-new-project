const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);
