const mongoose = require('mongoose');

// File schema for uploaded documents
const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    enum: ['property_damage', 'identification', 'ownership', 'other'],
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  base64: {
    type: String, // Store base64 data for now, can be moved to file storage later
  },
  checksum: {
    type: String,
  },
  url: {
    type: String, // For future file storage URLs
  },
});

// Family data schema based on frontend form
const familyDataSchema = new mongoose.Schema({
  // Family Information
  familyName: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  headOfHousehold: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  alternatePhone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  nationalId: {
    type: String,
    trim: true,
  },
  numberOfMembers: {
    type: Number,
    required: true,
    min: 1,
  },
  childrenCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  elderlyCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  specialNeedsCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Address Information
  village: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  currentAddress: {
    type: String,
    required: true,
    trim: true,
  },
  originalAddress: {
    type: String,
    required: true,
    trim: true,
  },
  propertyType: {
    type: String,
    enum: ['house', 'apartment', 'shop', 'other'],
    required: true,
  },
  ownershipStatus: {
    type: String,
    enum: ['owned', 'rented', 'inherited'],
    required: true,
  },
  propertyValue: {
    type: Number,
    min: 0,
  },

  // Destruction Details
  destructionDate: {
    type: Date,
    required: true,
  },
  destructionCause: {
    type: String,
    required: true,
    trim: true,
  },
  destructionPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  damageDescription: {
    type: String,
    required: true,
    trim: true,
  },
  previouslyReceivedAid: {
    type: String,
    enum: ['yes', 'no'],
    required: true,
  },
  aidDetails: {
    type: String,
    trim: true,
  },

  // Supporting Information
  witnessName: {
    type: String,
    trim: true,
  },
  witnessPhone: {
    type: String,
    trim: true,
  },
  emergencyContact: {
    type: String,
    trim: true,
  },
  emergencyPhone: {
    type: String,
    trim: true,
  },
});

// Checker decision schema
const checkerDecisionSchema = new mongoose.Schema({
  checkerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  decision: {
    type: String,
    enum: ['approved', 'rejected'],
    required: true,
  },
  comments: {
    type: String,
    required: true,
    trim: true,
  },
  finalDamagePercentage: {
    type: Number,
    min: 0,
    max: 100,
  },
  estimatedCost: {
    type: Number,
    min: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Audit log schema for tracking all actions on a case
const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'submitted', 'assigned', 'reviewed', 'approved', 'rejected', 'donated', 'fully_funded'],
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  performedByRole: {
    type: String,
    enum: ['family', 'admin', 'checker', 'donor'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  details: {
    type: mongoose.Mixed, // Flexible field for action-specific details
  },
  notes: {
    type: String,
    trim: true,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
});

// Checker assignment schema
const checkerAssignmentSchema = new mongoose.Schema({
  checkerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
});

// Main case schema
const caseSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: false, // Will be auto-generated in pre-save hook
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userEmail: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'fully_funded'],
    default: 'draft',
    index: true,
  },
  familyData: {
    type: familyDataSchema,
    required: true,
  },
  uploadedFiles: [fileSchema],
  checkerDecision: checkerDecisionSchema,
  checkerAssignment: checkerAssignmentSchema,
  auditLog: [auditLogSchema],

  // Financial tracking (for approved cases)
  totalNeeded: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalRaised: {
    type: Number,
    default: 0,
    min: 0,
  },
  donationProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  submittedAt: {
    type: Date,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  approvedAt: {
    type: Date,
  },
  reviewStartedAt: {
    type: Date,
  },
  fullyFundedAt: {
    type: Date,
  },

  // Metadata
  version: {
    type: String,
    default: '1.0',
  },
  source: {
    type: String,
    default: 'family_dashboard',
  },
  formCompletion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
});

// Generate unique case ID before saving
caseSchema.pre('save', function(next) {
  if (!this.caseId) {
    this.caseId = `SLA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  }

  // Update last modified timestamp
  this.lastModified = new Date();

  // Set submitted timestamp when status changes to submitted
  if (this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }

  // Set review started timestamp when status changes to under_review
  if (this.status === 'under_review' && !this.reviewStartedAt) {
    this.reviewStartedAt = new Date();
  }

  // Set approved timestamp when status changes to approved
  if (this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }

  // Calculate total needed from checker decision
  if (this.checkerDecision && this.checkerDecision.estimatedCost) {
    this.totalNeeded = this.checkerDecision.estimatedCost;
  }

  // Calculate donation progress
  if (this.totalNeeded > 0) {
    this.donationProgress = Math.min(Math.round((this.totalRaised / this.totalNeeded) * 100), 100);
    
    // Auto-update status to fully_funded when progress reaches 100%
    if (this.donationProgress >= 100 && this.status === 'approved') {
      this.status = 'fully_funded';
      if (!this.fullyFundedAt) {
        this.fullyFundedAt = new Date();
      }
    }
  }

  next();
});

// Instance methods
caseSchema.methods.calculateFormCompletion = function() {
  const requiredFields = [
    'familyData.familyName', 'familyData.headOfHousehold', 'familyData.phoneNumber',
    'familyData.numberOfMembers', 'familyData.village', 'familyData.currentAddress',
    'familyData.originalAddress', 'familyData.destructionDate', 'familyData.destructionPercentage',
    'familyData.damageDescription',
  ];

  let completedFields = 0;
  requiredFields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], this);
    if (value && value.toString().trim() !== '') {
      completedFields++;
    }
  });

  this.formCompletion = Math.round((completedFields / requiredFields.length) * 100);
  return this.formCompletion;
};

caseSchema.methods.updateDonationProgress = function() {
  if (this.totalNeeded > 0) {
    this.donationProgress = Math.min(Math.round((this.totalRaised / this.totalNeeded) * 100), 100);
  }
  return this.donationProgress;
};

// Method to add audit log entry
caseSchema.methods.addAuditLog = function(action, performedBy, performedByRole, details = {}, notes = '', ipAddress = '') {
  this.auditLog.push({
    action,
    performedBy,
    performedByRole,
    details,
    notes,
    ipAddress,
    timestamp: new Date(),
  });
};

// Method to get audit log for a specific action type
caseSchema.methods.getAuditLogByAction = function(action) {
  return this.auditLog.filter(log => log.action === action);
};

// Method to get the latest audit log entry
caseSchema.methods.getLatestAuditLog = function() {
  return this.auditLog.length > 0 ? this.auditLog[this.auditLog.length - 1] : null;
};

// Static methods
caseSchema.statics.generateCaseId = function() {
  return `SLA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
};

// Indexes for better performance
caseSchema.index({ userId: 1, status: 1 });
caseSchema.index({ 'familyData.village': 1, status: 1 });
caseSchema.index({ status: 1, createdAt: -1 });
caseSchema.index({ caseId: 1 }, { unique: true });

module.exports = mongoose.model('Case', caseSchema);
