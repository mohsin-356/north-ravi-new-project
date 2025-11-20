const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  date: { type: Date, required: true, default: Date.now },
  diagnosis: String,
  prescription: String,
  notes: String,
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' }
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);
