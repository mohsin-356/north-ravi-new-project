const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const indoorUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: false, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'pharmacist', 'salesman'], lowercase: true, default: 'salesman' },
  },
  { timestamps: true, collection: 'indoor_user' }
);

indoorUserSchema.index({ username: 1 }, { unique: true });
indoorUserSchema.index({ email: 1 }, { unique: true, sparse: true });

indoorUserSchema.pre('save', async function(next){
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) { next(err); }
});

indoorUserSchema.methods.comparePassword = function(candidate){
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.models.IndoorUser || mongoose.model('IndoorUser', indoorUserSchema);
