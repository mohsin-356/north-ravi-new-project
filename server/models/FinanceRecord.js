const mongoose = require('mongoose');

const financeRecordSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  description: String,
  department: { 
    type: String, 
    required: true,
    enum: ['IPD', 'OPD', 'Pharmacy', 'Lab']
  },
  type: {
    type: String,
    required: true,
    enum: ['Income', 'Expense']
  },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Use String IDs to match Patient and IpdAdmission schemas in this app
  patientId: { type: String, ref: 'Patient' },
  admissionId: { type: String, ref: 'IpdAdmission' }
});

module.exports = mongoose.model('FinanceRecord', financeRecordSchema);
