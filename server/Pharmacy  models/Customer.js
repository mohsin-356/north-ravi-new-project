const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  companyName: { type: String, trim: true },
  phone: { type: String, required: true },
  email: { type: String, trim: true, lowercase: true },
  address: { type: String, required: true },
  cnic: { type: String, required: true, trim: true },
  notes: { type: String },
  mrNumber: { type: String },
  customerSince: { type: Date, default: Date.now },
  totalPurchases: { type: Number, default: 0 },
  creditHistory: [
    {
      medicines: [
        {
          medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
          name: String,
          quantity: Number,
          price: Number
        }
      ],
      amount: { type: Number },
      date: { type: Date, default: Date.now },
      paid: { type: Boolean, default: false }
    }
  ],
}, { timestamps: true, collection: 'pharmacy_customer' });

// Indexes for faster search/sort in CustomerManagement
if (!customerSchema.indexes().some(([fields]) => fields.name)) {
  customerSchema.index({ name: 1 });
}
if (!customerSchema.indexes().some(([fields]) => fields.mrNumber)) {
  customerSchema.index({ mrNumber: 1 });
}
if (!customerSchema.indexes().some(([fields]) => fields.phone)) {
  customerSchema.index({ phone: 1 });
}
if (!customerSchema.indexes().some(([fields]) => fields.email)) {
  customerSchema.index({ email: 1 });
}
if (!customerSchema.indexes().some(([fields]) => fields.createdAt)) {
  customerSchema.index({ createdAt: -1 });
}

module.exports = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
