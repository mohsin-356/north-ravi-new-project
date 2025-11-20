const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  contactPerson: {
    type: String,
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
  },
  address: {
    type: String
  },
  taxId: {
    type: String,
  },
  totalPurchases: {
    type: Number,
    default: 0,
  },
  totalPaid: {
    type: Number,
    default: 0,
  },
  pendingPayments: {
    type: Number,
    default: 0,
  },
  lastOrder: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  supplies: [
    {
      name: String,
      cost: Number,
      quantity: Number,
      inventoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
      },
    },
  ],
  purchases: [
    {
      date: Date,
      amount: Number,
      items: String,
      invoice: String,
    },
  ],
  returns: [
    {
      amount: Number,
      date: { type: Date, default: Date.now },
      purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
    }
  ],
  payments: [
    {
      date: { type: Date, default: Date.now },
      amount: { type: Number, required: true },
      method: { type: String },
      note: { type: String },
    }
  ],

}, { timestamps: true, collection: 'pharmacy_supplier' });

// Indexes for faster search/sort in SupplierManagement
if (!SupplierSchema.indexes().some(([fields]) => fields.name)) {
  SupplierSchema.index({ name: 1 });
}
if (!SupplierSchema.indexes().some(([fields]) => fields.contactPerson)) {
  SupplierSchema.index({ contactPerson: 1 });
}
if (!SupplierSchema.indexes().some(([fields]) => fields.phone)) {
  SupplierSchema.index({ phone: 1 });
}
if (!SupplierSchema.indexes().some(([fields]) => fields.email)) {
  SupplierSchema.index({ email: 1 });
}
if (!SupplierSchema.indexes().some(([fields]) => fields.lastOrder)) {
  SupplierSchema.index({ lastOrder: -1 });
}

module.exports = mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);
