const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
  addStockId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AddStock',
    required: false
  },
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  medicineName: {
    type: String,
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  supplierName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true // Number of packs purchased
  },
  packQuantity: {
    type: Number,
    required: true // Units per pack
  },
  totalItems: {
    type: Number,
    required: true // Total units (quantity * packQuantity)
  },
  buyPricePerPack: {
    type: Number,
    required: true // Buy price per pack
  },
  buyPricePerUnit: {
    type: Number,
    required: true // Buy price per unit (buyPricePerPack / packQuantity)
  },
  totalPurchaseAmount: {
    type: Number,
    required: true // Total purchase amount (buyPricePerPack * quantity)
  },
  salePricePerPack: {
    type: Number
  },
  salePricePerUnit: {
    type: Number
  },
  invoiceNumber: {
    type: String
  },
  expiryDate: {
    type: Date
  },
  minStock: {
    type: Number,
    default: 0
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true,
  collection: 'pharmacy_purchase'
});

// Index for efficient queries
PurchaseSchema.index({ addStockId: 1 });
PurchaseSchema.index({ supplier: 1, purchaseDate: -1 });
PurchaseSchema.index({ medicine: 1, purchaseDate: -1 });
PurchaseSchema.index({ supplierName: 1, purchaseDate: -1 });

module.exports = mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);
