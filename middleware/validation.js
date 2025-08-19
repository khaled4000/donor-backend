const { body, query, param, validationResult } = require('express-validator');

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = {};
    errors.array().forEach(error => {
      if (!errorMessages[error.path]) {
        errorMessages[error.path] = [];
      }
      errorMessages[error.path].push(error.msg);
    });

    return res.status(400).json({
      message: 'Validation failed',
      fields: errorMessages,
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email must be less than 100 characters'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('role')
    .isIn(['donor', 'family', 'checker'])
    .withMessage('Role must be donor, family, or checker'),

  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  handleValidationErrors,
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors,
];

// Case submission validation
const validateCaseSubmission = [
  body('familyData.familyName')
    .notEmpty()
    .withMessage('Family name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Family name must be between 2 and 100 characters'),

  body('familyData.headOfHousehold')
    .notEmpty()
    .withMessage('Head of household is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Head of household must be between 2 and 100 characters'),

  body('familyData.phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  body('familyData.numberOfMembers')
    .isInt({ min: 1, max: 50 })
    .withMessage('Number of members must be between 1 and 50'),

  body('familyData.village')
    .notEmpty()
    .withMessage('Village is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Village name must be between 2 and 100 characters'),

  body('familyData.currentAddress')
    .notEmpty()
    .withMessage('Current address is required')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Current address must be between 10 and 500 characters'),

  body('familyData.originalAddress')
    .notEmpty()
    .withMessage('Original address is required')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Original address must be between 10 and 500 characters'),

  body('familyData.destructionDate')
    .isISO8601()
    .withMessage('Please provide a valid destruction date'),

  body('familyData.destructionPercentage')
    .isInt({ min: 1, max: 100 })
    .withMessage('Destruction percentage must be between 1 and 100'),

  body('familyData.damageDescription')
    .notEmpty()
    .withMessage('Damage description is required')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Damage description must be between 20 and 2000 characters'),

  body('familyData.propertyType')
    .isIn(['house', 'apartment', 'shop', 'other'])
    .withMessage('Property type must be house, apartment, shop, or other'),

  body('familyData.ownershipStatus')
    .isIn(['owned', 'rented', 'inherited'])
    .withMessage('Ownership status must be owned, rented, or inherited'),

  body('familyData.previouslyReceivedAid')
    .isIn(['yes', 'no'])
    .withMessage('Previously received aid must be yes or no'),

  handleValidationErrors,
];

// Donation validation
const validateDonation = [
  body('caseId')
    .notEmpty()
    .withMessage('Case ID is required')
    .matches(/^SLA-\d{4}-\d{6}$/)
    .withMessage('Invalid case ID format'),

  body('amount')
    .isFloat({ min: 1, max: 1000000 })
    .withMessage('Donation amount must be between $1 and $1,000,000'),

  body('paymentMethod')
    .optional()
    .isIn(['credit_card', 'paypal', 'bank_transfer', 'cash', 'other'])
    .withMessage('Invalid payment method'),

  body('anonymous')
    .optional()
    .isBoolean()
    .withMessage('Anonymous must be true or false'),

  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must be less than 500 characters'),

  handleValidationErrors,
];

// Case decision validation
const validateCaseDecision = [
  body('decision')
    .isIn(['approved', 'rejected'])
    .withMessage('Decision must be approved or rejected'),

  body('comments')
    .notEmpty()
    .withMessage('Comments are required')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comments must be between 10 and 1000 characters'),

  body('finalDamagePercentage')
    .if(body('decision').equals('approved'))
    .isInt({ min: 1, max: 100 })
    .withMessage('Final damage percentage must be between 1 and 100 for approved cases'),

  body('estimatedCost')
    .if(body('decision').equals('approved'))
    .isFloat({ min: 100, max: 10000000 })
    .withMessage('Estimated cost must be between $100 and $10,000,000 for approved cases'),

  handleValidationErrors,
];

// Query parameter validation for pagination
const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater'),

  handleValidationErrors,
];

// Case ID parameter validation
const validateCaseId = [
  param('caseId')
    .matches(/^SLA-\d{4}-\d{6}$/)
    .withMessage('Invalid case ID format'),

  handleValidationErrors,
];

// File upload validation
const validateFileUpload = [
  body('category')
    .isIn(['property_damage', 'identification', 'ownership', 'other'])
    .withMessage('File category must be property_damage, identification, ownership, or other'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('File description must be less than 200 characters'),

  handleValidationErrors,
];

// Profile update validation
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address must be less than 200 characters'),

  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateCaseSubmission,
  validateDonation,
  validateCaseDecision,
  validatePagination,
  validateCaseId,
  validateFileUpload,
  validateProfileUpdate,
};
