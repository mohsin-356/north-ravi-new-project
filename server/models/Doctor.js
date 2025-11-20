const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const User = require('./User');

const doctorSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    departmentId: { type: String, ref: 'Department' },
    specialization: { type: String },
    qualifications: { type: String },
    phone: { type: String },
    email: { type: String },
    cnic: { type: String },
    username: { type: String },
    // Legacy support: keep `fee` field and alias it to consultationFee for backward compatibility
    fee: { type: Number, default: 0 },
    consultationFee: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique indexes for username and cnic (allow missing values)
if (!doctorSchema.indexes().some(([fields]) => fields.username)) {
  doctorSchema.index({ username: 1 }, { unique: true, sparse: true });
}
if (!doctorSchema.indexes().some(([fields]) => fields.cnic)) {
  doctorSchema.index({ cnic: 1 }, { unique: true, sparse: true });
}

// Index on name for faster search/sort (pharmacy referrals, etc.)
if (!doctorSchema.indexes().some(([fields]) => fields.name)) {
  doctorSchema.index({ name: 1 });
}

// Ensure API responses always include both fields for backward compatibility
doctorSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const cf = ret.consultationFee;
    const f = ret.fee;
    ret.consultationFee = typeof cf === 'number' ? cf : (typeof f === 'number' ? f : 0);
    ret.fee = typeof f === 'number' ? f : (typeof cf === 'number' ? cf : 0);
    return ret;
  }
});

doctorSchema.set('toObject', {
  virtuals: true,
  transform: (_doc, ret) => {
    const cf = ret.consultationFee;
    const f = ret.fee;
    ret.consultationFee = typeof cf === 'number' ? cf : (typeof f === 'number' ? f : 0);
    ret.fee = typeof f === 'number' ? f : (typeof cf === 'number' ? cf : 0);
    return ret;
  }
});

// Ensure legacy `fee` and new `consultationFee` stay in sync
function syncFees(next) {
  if (this._update) {
    const update = this._update;
    if (update.consultationFee !== undefined && update.fee === undefined) {
      update.fee = update.consultationFee;
    }
    if (update.fee !== undefined && update.consultationFee === undefined) {
      update.consultationFee = update.fee;
    }
  } else {
    // Document save.
    if (this.consultationFee !== undefined && this.fee === undefined) {
      this.fee = this.consultationFee;
    }
    if (this.fee !== undefined && this.consultationFee === undefined) {
      this.consultationFee = this.fee;
    }
  }
  next();
}

async function syncUser(next) {
  const doctor = this;
  
  try {
    if (doctor.isNew) {
      // Check if user already exists
      const linkUsername = doctor.username || doctor.email;
      if (!linkUsername) {
        // No username/email provided; skip auto user creation
        return next();
      }
      const existingUser = await User.findOne({ username: linkUsername });
      if (!existingUser) {
        // Generate secure password
        const crypto = require('crypto');
        const password = crypto.randomBytes(8).toString('hex');
        
        // Create user
        const user = new User({
          name: doctor.name,
          username: linkUsername,
          password: password,
          role: 'doctor',
          mustChangePassword: true
        });
        
        await user.save();
        console.log(`Created user account for doctor ${doctor.name}`);
      }
    }
    next();
  } catch (err) {
    console.error('Doctor-User sync error:', err.message);
    next(err);
  }
}

doctorSchema.pre('save', syncFees);
doctorSchema.pre('save', syncUser);
doctorSchema.pre('findOneAndUpdate', syncFees);
// Note: Do NOT sync user on updates via findOneAndUpdate, as the query middleware
// doesn't have access to document state like `isNew` and can cause unintended user creation.

doctorSchema.pre('updateOne', syncFees);

doctorSchema.pre('insertMany', function(next, docs){
  docs.forEach(doc => {
    if (doc.consultationFee !== undefined && doc.fee === undefined) {
      doc.fee = doc.consultationFee;
    }
    if (doc.fee !== undefined && doc.consultationFee === undefined) {
      doc.consultationFee = doc.fee;
    }
  });
  next();
});

doctorSchema.post('remove', async function(doc) {
  try {
    // Remove the linked user by username or email
    const linkUsername = doc.username || doc.email;
    if (linkUsername) await User.deleteOne({ username: linkUsername });
  } catch (err) {
    console.error('Error deleting user:', err);
  }
});

// Ensure deletion hook also runs for findOneAndDelete / findOneAndRemove
doctorSchema.post('findOneAndDelete', async function(doc) {
  try {
    if (!doc) return;
    const linkUsername = doc.username || doc.email;
    if (linkUsername) await User.deleteOne({ username: linkUsername });
  } catch (err) {
    console.error('Error deleting user on query delete:', err);
  }
});

doctorSchema.post('findOneAndRemove', async function(doc) {
  try {
    if (!doc) return;
    const linkUsername = doc.username || doc.email;
    if (linkUsername) await User.deleteOne({ username: linkUsername });
  } catch (err) {
    console.error('Error deleting user on query remove:', err);
  }
});

module.exports = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);
