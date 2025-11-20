const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const patientSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    // Use a partial unique index to avoid duplicate key errors on null/undefined values
    mrNumber: { type: String },
    name: { type: String, required: true },
    age: { type: String },
    gender: { type: String },
    phone: { type: String },
    address: { type: String },
    // New identity fields
    guardianRelation: { type: String }, // e.g. 'S/O', 'D/O'
    guardianName: { type: String },
    cnic: { type: String },
  },
  { timestamps: true }
);

// Ensure uniqueness only when mrNumber is a string (present)
if (!patientSchema.indexes().some(([fields]) => Object.keys(fields).includes('mrNumber'))) {
  patientSchema.index(
    { mrNumber: 1 },
    { unique: true, partialFilterExpression: { mrNumber: { $type: 'string' } } }
  );
}

// Index on name for faster search/sort in pharmacy referrals
if (!patientSchema.indexes().some(([fields]) => Object.keys(fields).includes('name'))) {
  patientSchema.index({ name: 1 });
}

module.exports = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
