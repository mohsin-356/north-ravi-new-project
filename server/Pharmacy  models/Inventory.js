const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
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
}, { collection: 'pharmacy_inventory' });

// Speed up prefix searches by name (used by /api/inventory/search)
InventorySchema.index({ name: 1 });

module.exports = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);
