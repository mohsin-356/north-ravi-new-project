const mongoose = require('mongoose');

const AddStockSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  // Number of packs being added to stock
  quantity: {
    type: Number,
    required: true
  },
  // How many units in ONE pack (e.g. 10 tablets per strip)
  packQuantity: {
    type: Number,
    required: true
  },
  // Purchase price of ONE pack
  buyPricePerPack: {
    type: Number,
    required: true
  },
  // Sale price of ONE pack (MRP)
  salePricePerPack: {
    type: Number,
    required: false
  },
  // Auto-calculated unit prices & profit for analytics
  unitBuyPrice: {
    type: Number,
    required: true
  },
  unitSalePrice: {
    type: Number,
    required: false
  },
  profitPerUnit: {
    type: Number,
    required: false
  },
  // Total individual items added (packs * items per pack)
  totalItems: {
    type: Number,
    required: true
  },
  unitPrice: {
    type: Number,
    required: true
  },
  invoiceNumber: {
    type: String,
    required: false
  },
  category: {
    type: String,
    required: false
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  expiryDate: {
    type: Date,
    required: false
  },
  minStock: {
    type: Number,
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { collection: 'pharmacy_addstock' });

module.exports = mongoose.models.AddStock || mongoose.model('AddStock', AddStockSchema);
