// const mongoose = require('mongoose');

// const MedicineSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model('Medicine', MedicineSchema);

// models/Medicine.js
const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'medicine' });

module.exports = mongoose.models.Medicine || mongoose.model('Medicine', MedicineSchema);
