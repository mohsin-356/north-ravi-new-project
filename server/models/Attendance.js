const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttendanceSchema = new Schema({
  staffId: { type: Schema.Types.ObjectId, ref: 'LabStaff', required: true },
  staffName: { type: String },
  date: { type: String, required: true }, // YYYY-MM-DD
  status: { type: String, enum: ['present', 'absent', 'leave'], required: true },
  checkInTime: { type: String },
  checkOutTime: { type: String },
}, { collection: 'lab_attendances' });

AttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

module.exports = mongoose.models.LabAttendance ||
  mongoose.model('LabAttendance', AttendanceSchema, 'lab_attendances');
