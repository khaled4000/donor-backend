const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user's email is verified
const requireEmailVerification = async (req, res, next) => {
  try {
    // Skip verification for admin/checker users
    if (req.user.role === 'checker' || req.user.role === 'admin') {
      return next();
    }

    // Check if user's email is verified
    if (!req.user.emailVerified) {
      return res.status(403).json({
        message: 'Email verification required',
        requiresVerification: true,
        email: req.user.email,
        error: 'Please verify your email address before accessing this feature.'
      });
    }

    next();
  } catch (error) {
    console.error('Email verification middleware error:', error);
    res.status(500).json({ message: 'Server error during verification check' });
  }
};

// Middleware to check if user can access family dashboard
const requireFamilyEmailVerification = async (req, res, next) => {
  try {
    if (req.user.role !== 'family') {
      return res.status(403).json({ message: 'Family role required' });
    }

    if (!req.user.emailVerified) {
      return res.status(403).json({
        message: 'Email verification required for family dashboard',
        requiresVerification: true,
        email: req.user.email,
        error: 'Please verify your email address before accessing the family dashboard.'
      });
    }

    next();
  } catch (error) {
    console.error('Family verification middleware error:', error);
    res.status(500).json({ message: 'Server error during verification check' });
  }
};

// Middleware to check if user can access donor dashboard
const requireDonorEmailVerification = async (req, res, next) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ message: 'Donor role required' });
    }

    if (!req.user.emailVerified) {
      return res.status(403).json({
        message: 'Email verification required for donor dashboard',
        requiresVerification: true,
        email: req.user.email,
        error: 'Please verify your email address before accessing the donor dashboard.'
      });
    }

    next();
  } catch (error) {
    console.error('Donor verification middleware error:', error);
    res.status(500).json({ message: 'Server error during verification check' });
  }
};

module.exports = {
  requireEmailVerification,
  requireFamilyEmailVerification,
  requireDonorEmailVerification
};
