const express = require('express');
const User = require('../models/User');
const Case = require('../models/Case');
const { adminOnlyAuth } = require('../middleware/adminAuth');
const emailService = require('../utils/emailService');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Validation middleware for creating checkers
const validateCheckerCreation = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('username').optional().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone number must be less than 20 characters'),
  body('address').optional().trim().isLength({ max: 200 }).withMessage('Address must be less than 200 characters'),
];

// Validation middleware for updating checkers
const validateCheckerUpdate = [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('username').optional().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone number must be less than 20 characters'),
  body('address').optional().trim().isLength({ max: 200 }).withMessage('Address must be less than 200 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false'),
];

// Get all checkers (Admin only)
router.get('/checkers', adminOnlyAuth, async (req, res) => {
  try {
    console.log('🔍 ADMIN CHECKER MGMT - Getting all checkers');

    const { limit = 50, offset = 0, status = 'all' } = req.query;

    // Build query
    const query = { role: 'checker' };
    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    const checkers = await User.find(query)
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate('createdBy', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await User.countDocuments(query);

    // Get case statistics for each checker
    const checkersWithStats = await Promise.all(
      checkers.map(async (checker) => {
        const assignedCases = await Case.countDocuments({ 'checkerAssignment.checkerId': checker._id });
        const approvedCases = await Case.countDocuments({ 
          'checkerDecision.checkerId': checker._id, 
          status: 'approved' 
        });
        const rejectedCases = await Case.countDocuments({ 
          'checkerDecision.checkerId': checker._id, 
          status: 'rejected' 
        });
        const pendingCases = await Case.countDocuments({ 
          'checkerAssignment.checkerId': checker._id, 
          status: 'under_review' 
        });

        return {
          id: checker._id,
          firstName: checker.firstName,
          lastName: checker.lastName,
          name: checker.name,
          username: checker.username,
          email: checker.email,
          phone: checker.phone,
          address: checker.address,
          isActive: checker.isActive,
          emailVerified: checker.emailVerified,
          lastLoginDate: checker.lastLoginDate,
          registrationDate: checker.registrationDate,
          createdAt: checker.createdAt,
          creationMethod: checker.creationMethod,
          createdBy: checker.createdBy ? {
            id: checker.createdBy._id,
            name: `${checker.createdBy.firstName} ${checker.createdBy.lastName}`,
            email: checker.createdBy.email,
            role: checker.createdBy.role,
          } : null,
          statistics: {
            totalAssigned: assignedCases,
            approved: approvedCases,
            rejected: rejectedCases,
            pending: pendingCases,
            reviewRate: assignedCases > 0 ? Math.round(((approvedCases + rejectedCases) / assignedCases) * 100) : 0,
          },
        };
      })
    );

    console.log('🔍 ADMIN CHECKER MGMT - Found', checkersWithStats.length, 'checkers');

    res.json({
      message: 'Checkers retrieved successfully',
      checkers: checkersWithStats,
      total,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + checkersWithStats.length < total,
      },
    });

  } catch (error) {
    console.error('❌ ADMIN CHECKER MGMT ERROR - Get checkers:', error);
    res.status(500).json({ message: 'Error retrieving checkers' });
  }
});

// Create new checker (Admin only)
router.post('/checkers', adminOnlyAuth, validateCheckerCreation, async (req, res) => {
  try {
    console.log('🔍 ADMIN CHECKER MGMT - Creating new checker');
    console.log('🔍 ADMIN CHECKER MGMT - Request body:', { ...req.body, password: '[REDACTED]' });

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ ADMIN CHECKER MGMT - Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Invalid input data',
        errors: errors.array(),
      });
    }

    const { firstName, lastName, username, email, password, phone, address, sendNotification = true } = req.body;

    // Check if user already exists (by email or username)
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        ...(username ? [{ username: username.toLowerCase() }] : [])
      ]
    });

    if (existingUser) {
      const conflictField = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(400).json({
        message: `A user with this ${conflictField} already exists`,
        errors: [{ field: conflictField, message: `${conflictField} already exists` }],
      });
    }

    // Create new checker
    const newChecker = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username ? username.trim().toLowerCase() : undefined,
      email: email.toLowerCase(),
      password,
      role: 'checker',
      userType: 'checker',
      phone: phone?.trim(),
      address: address?.trim(),
      emailVerified: true, // Admin-created checkers are pre-verified
      isActive: true,
      creationMethod: 'admin_created',
      createdBy: req.admin._id,
      createdByRole: 'checker', // The admin creating this is a checker
    });

    await newChecker.save();

    console.log('🔍 ADMIN CHECKER MGMT - Checker created:', newChecker._id);

    // Send notification email if requested and email service is available
    let emailSent = false;
    if (sendNotification && email) {
      try {
        emailSent = await emailService.sendCheckerWelcomeEmail(newChecker, password, req.admin);
        console.log(`📧 Welcome email ${emailSent ? 'sent' : 'failed'} for checker ${email}`);
      } catch (emailError) {
        console.error('❌ Email notification error:', emailError);
        // Don't fail the creation if email fails
      }
    }

    // Return created checker (without password)
    const checkerResponse = {
      id: newChecker._id,
      firstName: newChecker.firstName,
      lastName: newChecker.lastName,
      name: newChecker.name,
      username: newChecker.username,
      email: newChecker.email,
      phone: newChecker.phone,
      address: newChecker.address,
      isActive: newChecker.isActive,
      emailVerified: newChecker.emailVerified,
      role: newChecker.role,
      creationMethod: newChecker.creationMethod,
      createdAt: newChecker.createdAt,
      createdBy: {
        id: req.admin._id,
        name: `${req.admin.firstName} ${req.admin.lastName}`,
        email: req.admin.email,
      },
    };

    res.status(201).json({
      message: 'Checker created successfully',
      checker: checkerResponse,
      emailSent,
      credentials: {
        loginEmail: newChecker.email,
        loginUsername: newChecker.username,
        temporaryPassword: sendNotification ? '[Sent via email]' : password,
      },
    });

  } catch (error) {
    console.error('❌ ADMIN CHECKER MGMT ERROR - Create checker:', error);
    
    if (error.code === 11000) {
      // Handle duplicate key errors
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `A user with this ${field} already exists`,
        errors: [{ field, message: `${field} already exists` }],
      });
    }

    res.status(500).json({ message: 'Error creating checker account' });
  }
});

// Get specific checker details (Admin only)
router.get('/checkers/:checkerId', adminOnlyAuth, async (req, res) => {
  try {
    const { checkerId } = req.params;
    console.log('🔍 ADMIN CHECKER MGMT - Getting checker details:', checkerId);

    const checker = await User.findOne({ _id: checkerId, role: 'checker' })
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate('createdBy', 'firstName lastName email role');

    if (!checker) {
      return res.status(404).json({ message: 'Checker not found' });
    }

    // Get detailed statistics
    const assignedCases = await Case.find({ 'checkerAssignment.checkerId': checkerId })
      .sort({ 'checkerAssignment.assignedAt': -1 })
      .limit(10)
      .select('caseId familyData.familyName familyData.village status checkerAssignment checkerDecision');

    const stats = {
      totalAssigned: await Case.countDocuments({ 'checkerAssignment.checkerId': checkerId }),
      approved: await Case.countDocuments({ 'checkerDecision.checkerId': checkerId, status: 'approved' }),
      rejected: await Case.countDocuments({ 'checkerDecision.checkerId': checkerId, status: 'rejected' }),
      pending: await Case.countDocuments({ 'checkerAssignment.checkerId': checkerId, status: 'under_review' }),
    };

    const checkerDetails = {
      id: checker._id,
      firstName: checker.firstName,
      lastName: checker.lastName,
      name: checker.name,
      username: checker.username,
      email: checker.email,
      phone: checker.phone,
      address: checker.address,
      isActive: checker.isActive,
      emailVerified: checker.emailVerified,
      lastLoginDate: checker.lastLoginDate,
      registrationDate: checker.registrationDate,
      createdAt: checker.createdAt,
      creationMethod: checker.creationMethod,
      createdBy: checker.createdBy ? {
        id: checker.createdBy._id,
        name: `${checker.createdBy.firstName} ${checker.createdBy.lastName}`,
        email: checker.createdBy.email,
        role: checker.createdBy.role,
      } : null,
      statistics: {
        ...stats,
        reviewRate: stats.totalAssigned > 0 ? Math.round(((stats.approved + stats.rejected) / stats.totalAssigned) * 100) : 0,
      },
      recentCases: assignedCases.map(c => ({
        caseId: c.caseId,
        familyName: c.familyData.familyName,
        village: c.familyData.village,
        status: c.status,
        assignedAt: c.checkerAssignment?.assignedAt,
        decidedAt: c.checkerDecision?.timestamp,
      })),
    };

    res.json({
      message: 'Checker details retrieved successfully',
      checker: checkerDetails,
    });

  } catch (error) {
    console.error('❌ ADMIN CHECKER MGMT ERROR - Get checker details:', error);
    res.status(500).json({ message: 'Error retrieving checker details' });
  }
});

// Update checker (Admin only)
router.put('/checkers/:checkerId', adminOnlyAuth, validateCheckerUpdate, async (req, res) => {
  try {
    const { checkerId } = req.params;
    console.log('🔍 ADMIN CHECKER MGMT - Updating checker:', checkerId);

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ ADMIN CHECKER MGMT - Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Invalid input data',
        errors: errors.array(),
      });
    }

    const { firstName, lastName, username, email, phone, address, isActive, newPassword } = req.body;

    // Find the checker
    const checker = await User.findOne({ _id: checkerId, role: 'checker' });
    if (!checker) {
      return res.status(404).json({ message: 'Checker not found' });
    }

    // Prevent self-deactivation
    if (checker._id.toString() === req.admin._id.toString() && isActive === false) {
      return res.status(400).json({ 
        message: 'You cannot deactivate your own account' 
      });
    }

    // Check for conflicts if email or username is being changed
    if (email && email !== checker.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: checkerId } });
      if (existingUser) {
        return res.status(400).json({
          message: 'A user with this email already exists',
          errors: [{ field: 'email', message: 'Email already exists' }],
        });
      }
    }

    if (username && username !== checker.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase(), _id: { $ne: checkerId } });
      if (existingUser) {
        return res.status(400).json({
          message: 'A user with this username already exists',
          errors: [{ field: 'username', message: 'Username already exists' }],
        });
      }
    }

    // Update fields
    if (firstName) checker.firstName = firstName.trim();
    if (lastName) checker.lastName = lastName.trim();
    if (username !== undefined) checker.username = username ? username.trim().toLowerCase() : undefined;
    if (email) checker.email = email.toLowerCase();
    if (phone !== undefined) checker.phone = phone ? phone.trim() : undefined;
    if (address !== undefined) checker.address = address ? address.trim() : undefined;
    if (typeof isActive === 'boolean') checker.isActive = isActive;
    if (newPassword) checker.password = newPassword; // Will be hashed by pre-save hook

    await checker.save();

    console.log('🔍 ADMIN CHECKER MGMT - Checker updated:', checkerId);

    // Return updated checker (without password)
    const updatedChecker = {
      id: checker._id,
      firstName: checker.firstName,
      lastName: checker.lastName,
      name: checker.name,
      username: checker.username,
      email: checker.email,
      phone: checker.phone,
      address: checker.address,
      isActive: checker.isActive,
      emailVerified: checker.emailVerified,
      lastLoginDate: checker.lastLoginDate,
      updatedAt: new Date(),
    };

    res.json({
      message: 'Checker updated successfully',
      checker: updatedChecker,
      passwordChanged: !!newPassword,
    });

  } catch (error) {
    console.error('❌ ADMIN CHECKER MGMT ERROR - Update checker:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `A user with this ${field} already exists`,
        errors: [{ field, message: `${field} already exists` }],
      });
    }

    res.status(500).json({ message: 'Error updating checker account' });
  }
});

// Delete checker (Admin only)
router.delete('/checkers/:checkerId', adminOnlyAuth, async (req, res) => {
  try {
    const { checkerId } = req.params;
    console.log('🔍 ADMIN CHECKER MGMT - Deleting checker:', checkerId);

    // Find the checker
    const checker = await User.findOne({ _id: checkerId, role: 'checker' });
    if (!checker) {
      return res.status(404).json({ message: 'Checker not found' });
    }

    // Prevent self-deletion
    if (checker._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({ 
        message: 'You cannot delete your own account' 
      });
    }

    // Check if checker has active cases
    const activeCases = await Case.countDocuments({
      $or: [
        { 'checkerAssignment.checkerId': checkerId, status: 'under_review' },
        { 'checkerDecision.checkerId': checkerId, status: { $in: ['approved', 'rejected'] } }
      ]
    });

    if (activeCases > 0) {
      return res.status(400).json({
        message: `Cannot delete checker with ${activeCases} associated cases. Please reassign cases first.`,
        activeCases,
      });
    }

    // Delete the checker
    await User.findByIdAndDelete(checkerId);

    console.log('🔍 ADMIN CHECKER MGMT - Checker deleted:', checkerId);

    res.json({
      message: 'Checker deleted successfully',
      deletedChecker: {
        id: checker._id,
        name: checker.name,
        email: checker.email,
      },
    });

  } catch (error) {
    console.error('❌ ADMIN CHECKER MGMT ERROR - Delete checker:', error);
    res.status(500).json({ message: 'Error deleting checker account' });
  }
});

// Toggle checker status (Admin only)
router.patch('/checkers/:checkerId/status', adminOnlyAuth, async (req, res) => {
  try {
    const { checkerId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be true or false' });
    }

    const checker = await User.findOne({ _id: checkerId, role: 'checker' });
    if (!checker) {
      return res.status(404).json({ message: 'Checker not found' });
    }

    // Prevent self-deactivation
    if (checker._id.toString() === req.admin._id.toString() && isActive === false) {
      return res.status(400).json({ 
        message: 'You cannot deactivate your own account' 
      });
    }

    checker.isActive = isActive;
    await checker.save();

    res.json({
      message: `Checker ${isActive ? 'activated' : 'deactivated'} successfully`,
      checker: {
        id: checker._id,
        name: checker.name,
        email: checker.email,
        isActive: checker.isActive,
      },
    });

  } catch (error) {
    console.error('❌ ADMIN CHECKER MGMT ERROR - Toggle status:', error);
    res.status(500).json({ message: 'Error updating checker status' });
  }
});

// Get checker creation statistics (Admin only)
router.get('/checkers/stats/overview', adminOnlyAuth, async (req, res) => {
  try {
    console.log('🔍 ADMIN CHECKER MGMT - Getting checker statistics');

    const stats = await User.aggregate([
      { $match: { role: 'checker' } },
      {
        $group: {
          _id: null,
          totalCheckers: { $sum: 1 },
          activeCheckers: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactiveCheckers: { $sum: { $cond: ['$isActive', 0, 1] } },
          adminCreated: { $sum: { $cond: [{ $eq: ['$creationMethod', 'admin_created'] }, 1, 0] } },
          selfRegistered: { $sum: { $cond: [{ $eq: ['$creationMethod', 'self_registration'] }, 1, 0] } },
        },
      },
    ]);

    const checkerStats = stats[0] || {
      totalCheckers: 0,
      activeCheckers: 0,
      inactiveCheckers: 0,
      adminCreated: 0,
      selfRegistered: 0,
    };

    // Get recent checker activity
    const recentCheckers = await User.find({ role: 'checker' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName email createdAt creationMethod isActive')
      .populate('createdBy', 'firstName lastName');

    res.json({
      message: 'Checker statistics retrieved successfully',
      stats: {
        ...checkerStats,
        creationRate: checkerStats.totalCheckers > 0 ? 
          Math.round((checkerStats.adminCreated / checkerStats.totalCheckers) * 100) : 0,
      },
      recentCheckers: recentCheckers.map(c => ({
        id: c._id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        createdAt: c.createdAt,
        creationMethod: c.creationMethod,
        isActive: c.isActive,
        createdBy: c.createdBy ? `${c.createdBy.firstName} ${c.createdBy.lastName}` : null,
      })),
    });

  } catch (error) {
    console.error('❌ ADMIN CHECKER MGMT ERROR - Get stats:', error);
    res.status(500).json({ message: 'Error retrieving checker statistics' });
  }
});

module.exports = router;
