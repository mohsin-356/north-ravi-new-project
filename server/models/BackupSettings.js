const mongoose = require('mongoose');

const backupSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'backup_settings' },
    enabled: { type: Boolean, default: false },
    intervalMinutes: { type: Number, default: 60 },
    folderPath: { type: String, default: '' },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BackupSettings || mongoose.model('BackupSettings', backupSettingsSchema);
