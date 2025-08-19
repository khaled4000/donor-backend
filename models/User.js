const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['donor', 'family', 'checker', 'admin'],
    required: true,
    index: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  userType: {
    type: String,
    enum: ['donor', 'family', 'checker', 'admin'],
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
    sparse: true,
    index: true,
  },
  emailVerificationExpires: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
    sparse: true,
    index: true,
  },
  passwordResetExpires: {
    type: Date,
  },
  lastLoginDate: {
    type: Date,
    default: null,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  // Admin creation tracking (for checker accounts created by admins)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true, // Only for accounts created by admins
  },
  createdByRole: {
    type: String,
    enum: ['admin', 'checker', 'system'],
    sparse: true,
  },
  creationMethod: {
    type: String,
    enum: ['self_registration', 'admin_created', 'system_created'],
    default: 'self_registration',
  },
  
  // Username field for checker login (optional alternative to email)
  username: {
    type: String,
    sparse: true,
    trim: true,
    index: true,
  },
});

// Hash password and set name before saving
userSchema.pre('save', async function(next) {
  // Set name field from firstName + lastName
  if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`;
  }

  // Set userType same as role for compatibility
  if (this.role && !this.userType) {
    this.userType = this.role;
  }

  // Hash password if modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return this.emailVerificationToken;
};

// Method to verify email token
userSchema.methods.verifyEmailToken = function(token) {
  if (this.emailVerificationToken !== token) {
    return false;
  }
  
  if (this.emailVerificationExpires < new Date()) {
    return false;
  }
  
  this.emailVerified = true;
  this.emailVerificationToken = undefined;
  this.emailVerificationExpires = undefined;
  return true;
};

// Method to check if email verification is required
userSchema.methods.isEmailVerificationRequired = function() {
  return this.role !== 'checker' && !this.emailVerified;
};

module.exports = mongoose.model('User', userSchema);
