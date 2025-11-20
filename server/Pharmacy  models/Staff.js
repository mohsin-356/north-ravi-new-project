const mongoose = require('mongoose');

// Embedded attendance record for a single day
const attendanceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'leave', 'half-day'],
      default: 'present',
    },
    checkIn: { type: String }, // HH:mm
    checkOut: { type: String },
    note: { type: String },
  },
  { _id: false }
);

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    designation: { type: String },
    phone: { type: String },
    email: { type: String },
    salary: { type: Number },
    joinDate: { type: Date },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    attendance: [attendanceSchema],
  },
  { timestamps: true, collection: 'pharmacy_staff'}
);

module.exports = mongoose.models.PharmacyStaff || mongoose.model('PharmacyStaff', staffSchema);
