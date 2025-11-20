const mongoose = require('mongoose');

const MonthlySaleSchema = new mongoose.Schema({
  month: { type: String, required: true, unique: true }, // Format: YYYY-MM
  totalAmount: { type: Number, default: 0 },
  numberOfSales: { type: Number, default: 0 },
  sales: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }]
}, { collection: 'pharmacy_monthlysale' });

module.exports = mongoose.models.MonthlySale || mongoose.model('MonthlySale', MonthlySaleSchema);
