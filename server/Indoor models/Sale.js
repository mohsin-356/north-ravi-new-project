const mongoose = require('mongoose');

const IndoorSaleSchema = new mongoose.Schema({
  items: [
    {
      medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'IndoorInventory', required: true },
      quantity: { type: Number, required: true },
      medicineName: { type: String },
      price: { type: Number, required: true },
    }
  ],
  billNo: { type: String, index: true },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  paymentMethod: { type: String },
  customerId: { type: String },
  customerName: { type: String },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'indoor_sale' });

module.exports = mongoose.models.IndoorSale || mongoose.model('IndoorSale', IndoorSaleSchema);
