const mongoose = require('mongoose');

// Hospital StaffSetting model (key/value store) used by routes/staffSettings.js
// Example keys: 'attendance', 'shift', 'leavePolicy'
const StaffSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StaffSetting', StaffSettingSchema);
