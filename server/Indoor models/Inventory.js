const mongoose = require('mongoose');

const IndoorInventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String },
  stock: { type: Number, required: true },
  price: { type: Number, required: true },
  batchNumber: { type: String },
  expiryDate: { type: Date },
  invoiceNumber: { type: String },
  supplierId: { type: String },
  lastPurchaseDate: { type: Date },
  lastPurchasePrice: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'indoor_inventory' });

IndoorInventorySchema.index({ name: 1 });

module.exports = mongoose.models.IndoorInventory || mongoose.model('IndoorInventory', IndoorInventorySchema);
