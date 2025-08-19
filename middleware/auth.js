const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    console.log('🔍 AUTH DEBUG - Auth middleware called for:', req.method, req.path);

    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('🔍 AUTH DEBUG - Token extracted:', token ? 'Token present' : 'No token');

    if (!token) {
      console.log('❌ AUTH ERROR - No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    console.log('🔍 AUTH DEBUG - Token decoded, userId:', decoded.userId);

    const user = await User.findById(decoded.userId).select('-password');
    console.log('🔍 AUTH DEBUG - User found:', user ? { id: user._id, email: user.email, role: user.role } : 'No user');

    if (!user) {
      console.log('❌ AUTH ERROR - User not found in database');
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    console.log('🔍 AUTH DEBUG - Auth successful, proceeding to next middleware');
    next();
  } catch (error) {
    console.error('❌ AUTH ERROR - Auth middleware error:', error.message);
    console.error('❌ AUTH ERROR - Full error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is a donor
const isDonor = (req, res, next) => {
  if (req.user.role !== 'donor') {
    return res.status(403).json({ message: 'Access denied. Donor role required.' });
  }
  next();
};

// Middleware to check if user is a family
const isFamily = (req, res, next) => {
  console.log('🔍 FAMILY AUTH DEBUG - Checking family role for user:', req.user ? { id: req.user._id, role: req.user.role } : 'No user');

  if (!req.user) {
    console.log('❌ FAMILY AUTH ERROR - No user in request');
    return res.status(403).json({ message: 'Access denied. User not authenticated.' });
  }

  if (req.user.role !== 'family') {
    console.log('❌ FAMILY AUTH ERROR - User role is not family:', req.user.role);
    return res.status(403).json({ message: 'Access denied. Family role required.' });
  }

  console.log('🔍 FAMILY AUTH DEBUG - Family role verified, proceeding');
  next();
};

// Middleware to check if user is a checker/admin
const isChecker = (req, res, next) => {
  if (req.user.role !== 'checker') {
    return res.status(403).json({ message: 'Access denied. Checker role required.' });
  }
  next();
};

// Middleware to check if user is either donor or checker (for viewing cases)
const isDonorOrChecker = (req, res, next) => {
  if (req.user.role !== 'donor' && req.user.role !== 'checker') {
    return res.status(403).json({ message: 'Access denied. Donor or Checker role required.' });
  }
  next();
};

module.exports = { auth, isDonor, isFamily, isChecker, isDonorOrChecker };
