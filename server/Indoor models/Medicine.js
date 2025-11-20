const mongoose = require('mongoose');

const IndoorMedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  barcode: { type: String },
  genericName: { type: String },
  manufacturer: { type: String },
  category: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'indoor_medicine' });

// Helpful indexes for search
try {
  IndoorMedicineSchema.index({ name: 1 });
  IndoorMedicineSchema.index({ barcode: 1 });
} catch {}

module.exports = mongoose.models.IndoorMedicine || mongoose.model('IndoorMedicine', IndoorMedicineSchema);
