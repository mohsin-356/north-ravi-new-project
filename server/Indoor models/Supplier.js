const mongoose = require('mongoose');

const IndoorSupplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  taxId: { type: String },
  totalPurchases: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  pendingPayments: { type: Number, default: 0 },
  lastOrder: { type: Date },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  supplies: [
    {
      name: String,
      cost: Number,
      quantity: Number,
      inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'IndoorInventory' }
    }
  ],
  purchases: [
    {
      date: Date,
      amount: Number,
      items: String,
      invoice: String
    }
  ],
  returns: [
    {
      amount: Number,
      date: { type: Date, default: Date.now },
      purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'IndoorPurchase' }
    }
  ],
  payments: [
    {
      date: { type: Date, default: Date.now },
      amount: { type: Number, required: true },
      method: { type: String },
      note: { type: String }
    }
  ]
}, { timestamps: true, collection: 'indoor_supplier' });

// Indexes for quick search
try {
  IndoorSupplierSchema.index({ name: 1 });
  IndoorSupplierSchema.index({ phone: 1 });
  IndoorSupplierSchema.index({ email: 1 });
  IndoorSupplierSchema.index({ lastOrder: -1 });
} catch {}

module.exports = mongoose.models.IndoorSupplier || mongoose.model('IndoorSupplier', IndoorSupplierSchema);
