const mongoose = require('mongoose');

const IndoorAddStockSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'IndoorMedicine', required: true },
  quantity: { type: Number, required: true }, // number of packs
  packQuantity: { type: Number, required: true }, // units per pack
  buyPricePerPack: { type: Number, required: true },
  salePricePerPack: { type: Number },
  unitBuyPrice: { type: Number, required: true },
  unitSalePrice: { type: Number },
  profitPerUnit: { type: Number },
  totalItems: { type: Number, required: true },
  unitPrice: { type: Number, required: true }, // legacy compat
  invoiceNumber: { type: String },
  category: { type: String },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'IndoorSupplier', required: true },
  expiryDate: { type: Date },
  minStock: { type: Number },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  date: { type: Date, default: Date.now }
}, { collection: 'indoor_addstock' });

module.exports = mongoose.models.IndoorAddStock || mongoose.model('IndoorAddStock', IndoorAddStockSchema);
