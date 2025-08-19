const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Input validation middleware
const validateAdminLogin = [
  body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// Admin login route - POST /api/admin/login
router.post('/login', validateAdminLogin, async (req, res) => {
  try {
    console.log('🔍 ADMIN LOGIN - Login attempt started');
    console.log('🔍 ADMIN LOGIN - Request body:', { username: req.body.username, password: '[REDACTED]' });

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ ADMIN LOGIN - Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Invalid input',
        errors: errors.array(),
      });
    }

    const { username, password } = req.body;

    // Sanitize input
    const sanitizedUsername = username.toLowerCase().trim();

    console.log('🔍 ADMIN LOGIN - Looking for checker with username:', sanitizedUsername);

    // Find checker user by email (using username as email)
    const checker = await User.findOne({
      email: sanitizedUsername,
      role: { $in: ['checker', 'admin'] },
      isActive: true,
    });

    if (!checker) {
      console.log('❌ ADMIN LOGIN - Checker/Admin not found or inactive');
      return res.status(401).json({
        message: 'Invalid credentials. Access denied.',
      });
    }

    console.log('🔍 ADMIN LOGIN - Checker/Admin found:', {
      id: checker._id,
      email: checker.email,
      role: checker.role,
    });

    // Verify password
    console.log('🔍 ADMIN LOGIN - Verifying password...');
    const isValidPassword = await checker.comparePassword(password);

    if (!isValidPassword) {
      console.log('❌ ADMIN LOGIN - Invalid password');
      return res.status(401).json({
        message: 'Invalid credentials. Access denied.',
      });
    }

    console.log('🔍 ADMIN LOGIN - Password verified, generating token...');

    // Update last login
    checker.lastLoginDate = new Date();
    await checker.save();

    // Generate JWT token with admin-specific claims
    const token = jwt.sign(
      {
        userId: checker._id,
        role: checker.role,
        email: checker.email,
        type: 'admin_session',
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '8h' }, // Shorter session for admin
    );

    console.log('🔍 ADMIN LOGIN - Login successful, sending response');

    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: checker._id,
        name: `${checker.firstName} ${checker.lastName}`,
        email: checker.email,
        role: checker.role,
        lastLogin: checker.lastLoginDate,
      },
    });

  } catch (error) {
    console.error('❌ ADMIN LOGIN ERROR - Full error:', error);
    res.status(500).json({
      message: 'Internal server error. Please try again.',
    });
  }
});

// Admin session verification - GET /api/admin/verify
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');

    // Verify it's an admin session
    if (decoded.type !== 'admin_session' || (decoded.role !== 'checker' && decoded.role !== 'admin')) {
      return res.status(403).json({ message: 'Invalid admin session' });
    }

    const admin = await User.findById(decoded.userId).select('-password');

    if (!admin || !admin.isActive || (admin.role !== 'checker' && admin.role !== 'admin')) {
      return res.status(401).json({ message: 'Admin session invalid' });
    }

    res.json({
      message: 'Admin session valid',
      admin: {
        id: admin._id,
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        role: admin.role,
      },
    });

  } catch (error) {
    console.error('Admin session verification error:', error);
    res.status(401).json({ message: 'Invalid admin session' });
  }
});

// Admin logout - POST /api/admin/logout
router.post('/logout', (req, res) => {
  console.log('🔍 ADMIN LOGOUT - Admin logged out');
  res.json({ message: 'Admin logged out successfully' });
});

module.exports = router;
