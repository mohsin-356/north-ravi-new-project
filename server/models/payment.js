const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  panelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Panel', required: true },
  amount: { type: Number, required: true },
  // Synthetic invoice id we use equals the patient._id returned by invoices API
  invoiceId: { type: String },
  method: { type: String },
  reference: { type: String },
}, { timestamps: true });

// Unique per (panelId, reference) to make repeated syncs idempotent
PaymentSchema.index({ panelId: 1, reference: 1 }, { unique: true, sparse: true });

module.exports.Payment = mongoose.model('Payment', PaymentSchema);
