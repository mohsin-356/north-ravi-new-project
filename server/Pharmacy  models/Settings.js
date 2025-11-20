const mongoose = require('mongoose');

// Single-document collection for global application settings
const SettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: 'PharmaCare',
  },
  companyAddress: {
    type: String,
    default: 'Main Boulevard, Gulshan-e-Iqbal, Karachi',
  },
  companyPhone: {
    type: String,
    default: '+92-21-1234567',
  },
  companyEmail: {
    type: String,
    default: 'info@pharmacare.com',
  },
  taxRate: {
    type: String,
    default: '17',
  },
  // Global discount percentage to apply in POS (0-100)
  discountRate: {
    type: String,
    default: '0',
  },
  taxEnabled: {
    type: Boolean,
    default: true,
  },
  taxInclusive: {
    type: Boolean,
    default: false,
  },
  currency: {
    type: String,
    default: 'PKR',
  },
  dateFormat: {
    type: String,
    default: 'dd/mm/yyyy',
  },
  notifications: {
    type: Boolean,
    default: true,
  },
  autoBackup: {
    type: Boolean,
    default: true,
  },
  printReceipts: {
    type: Boolean,
    default: true,
  },
  barcodeScanning: {
    type: Boolean,
    default: true,
  },
  language: {
    type: String,
    default: 'en',
  },
  // Billing slip settings
  template: {
    type: String,
    default: 'default',
  },
  slipName: {
    type: String,
    default: '',
  },
  footerText: {
    type: String,
    default: '',
  },
  logo: {
    type: String,
    default: '',
  },
}, { timestamps: true, collection: 'pharmacy_settings' });

// Use a unique model name to avoid collisions with the hospital Settings model
module.exports = mongoose.models.PharmacySettings || mongoose.model('PharmacySettings', SettingsSchema);