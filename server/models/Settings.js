const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'settings' },
    hospitalCode: { type: String, default: 'SAFH' },
    hospitalName: { type: String, default: 'Mindspire Hospital Management System' },
    hospitalLogo: { type: String, default: '' },
    dailyTokenCounter: { type: Number, default: 1 },
    lastTokenDate: { type: String, default: new Date().toDateString() },
    lastMRYear: { type: String, default: new Date().getFullYear().toString() },
    mrCounters: { type: Map, of: Number, default: {} }, // key: YYYYMM, value: counter
  },
  { timestamps: true }
);

module.exports = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
