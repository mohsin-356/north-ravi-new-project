const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Doctor = require('./Doctor');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'receptionist', 'doctor', 'ipd'],
      required: true,
    },
    mustChangePassword: { type: Boolean }
  },
  { timestamps: true }
);

// Add pre-remove hook for doctor user deletion
userSchema.pre('remove', async function(next) {
  if (this.role === 'doctor') {
    try {
      await Doctor.findByIdAndDelete(this.username);
    } catch (err) {
      console.error('Error deleting doctor:', err);
    }
  }
  next();
});

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// User validation
userSchema.pre('save', async function(next) {
  // Required fields check
  if (!this.username || !this.password) {
    const err = new Error('Username and password required');
    err.name = 'ValidationError';
    return next(err);
  }
  
  // Auto-set role if missing
  if (!this.role) {
    this.role = 'doctor';
  }
  
  // Auto-generate password if missing
  if (!this.password) {
    const crypto = require('crypto');
    this.password = crypto.randomBytes(8).toString('hex');
    this.mustChangePassword = true;
  }
  
  next();
});

// Password comparison helper
userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
