const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const doctorLedgerSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    doctorId: { type: String, ref: 'Doctor', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit'], required: true }, // credit = revenue, debit = handover/payout
    amount: { type: Number, required: true, min: 0 },
    description: { type: String },
    date: { type: Date, default: Date.now, index: true },
    source: { type: String, enum: ['manual', 'token', 'adjustment'], default: 'manual' },
    tokenId: { type: String, ref: 'Token' },
    createdBy: { type: String, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.DoctorLedger || mongoose.model('DoctorLedger', doctorLedgerSchema);
