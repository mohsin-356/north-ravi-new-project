const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    // Align with Patient/Token/Prescription where IDs are strings (UUIDs)
    patientId: { type: String, ref: 'Patient', required: true },
    doctorId: { type: String, ref: 'User', required: true },
    datetime: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
