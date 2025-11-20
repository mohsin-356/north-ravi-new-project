const mongoose = require('mongoose');

const IndoorDailySaleSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  totalAmount: { type: Number, default: 0 },
  numberOfSales: { type: Number, default: 0 },
  sales: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IndoorSale' }]
}, { collection: 'indoor_dailysale' });

module.exports = mongoose.models.IndoorDailySale || mongoose.model('IndoorDailySale', IndoorDailySaleSchema);
