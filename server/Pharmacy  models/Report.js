const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., 'sales', 'inventory', 'profit', etc.
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  generatedAt: { type: Date, default: Date.now }
}, { collection: 'pharmacy_report' });

module.exports = mongoose.models.Report || mongoose.model('Report', ReportSchema);
