const mongoose = require('mongoose');

// Single-document collection that stores global staff-related settings
const StaffSettingsSchema = new mongoose.Schema({
  leaveDeduction: {
    type: Number,
    default: 0,
  },
  lateDeduction: {
    type: Number,
    default: 0,
  },
  earlyOutDeduction: {
    type: Number,
    default: 0,
  },
  officialClockIn: {
    type: String, // Store as string e.g. "09:00 am"
    default: '09:00 am',
  },
  officialClockOut: {
    type: String, // Store as string e.g. "06:00 pm"
    default: '06:00 pm',
  },
}, { timestamps: true, collection: 'pharmacy_staffsettings' });

// Ensure only one document exists; we always query or update the first one
module.exports = mongoose.models.StaffSettings || mongoose.model('StaffSettings', StaffSettingsSchema);
