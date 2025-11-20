// User schema with username-based authentication
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: false, // Explicitly set required to false
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'pharmacist', 'salesman'],
      lowercase: true,
      default: 'salesman',
    },
  },
  { timestamps: true, collection: 'pharmacy_user' }
);

// Unique index on username
userSchema.index({ username: 1 }, { unique: true });

// Sparse unique index on email to allow multiple nulls
userSchema.index({ email: 1 }, { unique: true, sparse: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.PharmacyUser || mongoose.model('PharmacyUser', userSchema);