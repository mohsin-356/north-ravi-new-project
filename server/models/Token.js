const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const procedureSchema = new mongoose.Schema({
  name: String,
  fee: Number,
});

const tokenSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    tokenNumber: { type: String, required: true },
    patientId: { type: String, ref: 'Patient', required: true },
    patientName: String,
    age: String,
    gender: String,
    phone: String,
    address: String,
    // Identity fields for display/printing (also stored on Patient)
    guardianRelation: String, // 'S/O' | 'D/O'
    guardianName: String,
    cnic: String,
    doctorId: { type: String, ref: 'Doctor' },
    doctor: String,
    department: String,
    fee: Number,
    discount: Number,
    bloodPressure: String,
    symptoms: String,
    procedureDetails: String,
    procedures: [procedureSchema],
    dateTime: { type: Date, default: Date.now },
    finalFee: Number,
    mrNumber: String,
    // consultation workflow
    status: { type: String, enum: ['waiting', 'in consultation', 'completed'], default: 'waiting' },
    consultedAt: { type: Date },
    // billing
    billingType: { type: String, enum: ['cash', 'credit'], default: 'cash' },
    panelId: { type: String, ref: 'CorporatePanel' },
    panelName: { type: String },
  },
  { timestamps: true }
);

tokenSchema.index({ tokenNumber: 1, dateTime: -1 });

module.exports = mongoose.model('Token', tokenSchema);
