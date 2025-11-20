const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  items: [
    {
      medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
      quantity: { type: Number, required: true },
      medicineName: { type: String },
      price: { type: Number, required: true },
    }
  ],
  // Short human-friendly bill number printed on the receipt
  billNo: { type: String, index: true },
  totalAmount: { type: Number, required: true },
  // Amount settled/paid against this credit sale
  paidAmount: { type: Number, default: 0 },
  paymentMethod: { type: String },
  customerId: { type: String },
  customerName: { type: String },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'pharmacy_sale' });

// Reuse existing compiled model to avoid OverwriteModelError
module.exports = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);
