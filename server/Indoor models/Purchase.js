const mongoose = require('mongoose');

const IndoorPurchaseSchema = new mongoose.Schema({
  addStockId: { type: mongoose.Schema.Types.ObjectId, ref: 'IndoorAddStock' },
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'IndoorMedicine', required: true },
  medicineName: { type: String, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'IndoorSupplier', required: true },
  supplierName: { type: String, required: true },
  quantity: { type: Number, required: true }, // packs
  packQuantity: { type: Number, required: true }, // units per pack
  totalItems: { type: Number, required: true }, // total units
  buyPricePerPack: { type: Number, required: true },
  buyPricePerUnit: { type: Number, required: true },
  totalPurchaseAmount: { type: Number, required: true },
  salePricePerPack: { type: Number },
  salePricePerUnit: { type: Number },
  invoiceNumber: { type: String },
  expiryDate: { type: Date },
  minStock: { type: Number, default: 0 },
  purchaseDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' }
}, { timestamps: true, collection: 'indoor_purchase' });

IndoorPurchaseSchema.index({ addStockId: 1 });
IndoorPurchaseSchema.index({ supplier: 1, purchaseDate: -1 });
IndoorPurchaseSchema.index({ medicine: 1, purchaseDate: -1 });
IndoorPurchaseSchema.index({ supplierName: 1, purchaseDate: -1 });

module.exports = mongoose.models.IndoorPurchase || mongoose.model('IndoorPurchase', IndoorPurchaseSchema);
