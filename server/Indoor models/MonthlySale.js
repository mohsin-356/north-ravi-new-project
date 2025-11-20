const mongoose = require('mongoose');

const IndoorMonthlySaleSchema = new mongoose.Schema({
  month: { type: String, required: true, unique: true }, // YYYY-MM
  totalAmount: { type: Number, default: 0 },
  numberOfSales: { type: Number, default: 0 },
  sales: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IndoorSale' }]
}, { collection: 'indoor_monthlysale' });

module.exports = mongoose.models.IndoorMonthlySale || mongoose.model('IndoorMonthlySale', IndoorMonthlySaleSchema);
