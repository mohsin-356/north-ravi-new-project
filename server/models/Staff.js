const mongoose = require('mongoose');
const { Schema } = mongoose;

const StaffSchema = new Schema({
  name: { type: String, required: true, trim: true },
  position: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  salary: { type: Number },
  joinDate: { type: Date },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true, collection: 'lab_staff' });

module.exports = mongoose.models.LabStaff ||
  mongoose.model('LabStaff', StaffSchema, 'lab_staff');
