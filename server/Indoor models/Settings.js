const mongoose = require('mongoose');

const IndoorSettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Indoor Pharmacy' },
  companyAddress: { type: String, default: '' },
  companyPhone: { type: String, default: '' },
  companyEmail: { type: String, default: '' },
  taxRate: { type: String, default: '17' },
  discountRate: { type: String, default: '0' },
  taxEnabled: { type: Boolean, default: true },
  taxInclusive: { type: Boolean, default: false },
  currency: { type: String, default: 'PKR' },
  dateFormat: { type: String, default: 'dd/mm/yyyy' },
  notifications: { type: Boolean, default: true },
  autoBackup: { type: Boolean, default: true },
  printReceipts: { type: Boolean, default: true },
  barcodeScanning: { type: Boolean, default: true },
  language: { type: String, default: 'en' },
  template: { type: String, default: 'default' },
  slipName: { type: String, default: '' },
  footerText: { type: String, default: '' },
  logo: { type: String, default: '' },
}, { timestamps: true, collection: 'indoor_settings' });

module.exports = mongoose.models.IndoorSettings || mongoose.model('IndoorSettings', IndoorSettingsSchema);
