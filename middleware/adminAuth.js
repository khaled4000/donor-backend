const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    console.log('🔍 ADMIN AUTH - Admin authentication middleware called');

    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ ADMIN AUTH - No token provided');
      return res.status(401).json({ message: 'Access denied. No admin token provided.' });
    }

    console.log('🔍 ADMIN AUTH - Token found, verifying...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');

    // Verify it's an admin session
    if (decoded.type !== 'admin_session') {
      console.log('❌ ADMIN AUTH - Invalid session type:', decoded.type);
      return res.status(403).json({ message: 'Access denied. Invalid session type.' });
    }

    if (decoded.role !== 'checker' && decoded.role !== 'admin') {
      console.log('❌ ADMIN AUTH - Invalid role:', decoded.role);
      return res.status(403).json({ message: 'Access denied. Admin or Checker role required.' });
    }

    console.log('🔍 ADMIN AUTH - Looking up admin user:', decoded.userId);

    const admin = await User.findById(decoded.userId).select('-password');

    if (!admin) {
      console.log('❌ ADMIN AUTH - Admin user not found');
      return res.status(401).json({ message: 'Access denied. Admin user not found.' });
    }

    if (!admin.isActive || (admin.role !== 'checker' && admin.role !== 'admin')) {
      console.log('❌ ADMIN AUTH - Admin user inactive or invalid role');
      return res.status(401).json({ message: 'Access denied. Admin account inactive.' });
    }

    console.log('🔍 ADMIN AUTH - Admin authenticated:', {
      id: admin._id,
      email: admin.email,
      role: admin.role,
    });

    req.admin = admin;
    req.user = admin; // Also set req.user for compatibility with existing routes
    next();

  } catch (error) {
    console.error('❌ ADMIN AUTH ERROR:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Access denied. Invalid admin token.' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access denied. Admin session expired.' });
    }

    res.status(500).json({ message: 'Internal server error during authentication.' });
  }
};

// Middleware to restrict operations to admin users only (not checkers)
const adminOnlyAuth = async (req, res, next) => {
  try {
    console.log('🔍 ADMIN ONLY AUTH - Admin-only authentication middleware called');

    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ ADMIN ONLY AUTH - No token provided');
      return res.status(401).json({ message: 'Access denied. No admin token provided.' });
    }

    console.log('🔍 ADMIN ONLY AUTH - Token found, verifying...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');

    // Verify it's an admin session
    if (decoded.type !== 'admin_session') {
      console.log('❌ ADMIN ONLY AUTH - Invalid session type:', decoded.type);
      return res.status(403).json({ message: 'Access denied. Invalid session type.' });
    }

    // Only allow admin role (not checkers)
    if (decoded.role !== 'admin') {
      console.log('❌ ADMIN ONLY AUTH - Invalid role:', decoded.role);
      return res.status(403).json({ message: 'Access denied. Admin role required for this operation.' });
    }

    console.log('🔍 ADMIN ONLY AUTH - Looking up admin user:', decoded.userId);

    const admin = await User.findById(decoded.userId).select('-password');

    if (!admin) {
      console.log('❌ ADMIN ONLY AUTH - Admin user not found');
      return res.status(401).json({ message: 'Access denied. Admin user not found.' });
    }

    if (!admin.isActive || admin.role !== 'admin') {
      console.log('❌ ADMIN ONLY AUTH - Admin user inactive or invalid role');
      return res.status(401).json({ message: 'Access denied. Admin account inactive.' });
    }

    console.log('🔍 ADMIN ONLY AUTH - Admin authenticated:', {
      id: admin._id,
      email: admin.email,
      role: admin.role,
    });

    req.admin = admin;
    req.user = admin; // Also set req.user for compatibility with existing routes
    next();

  } catch (error) {
    console.error('❌ ADMIN ONLY AUTH ERROR:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Access denied. Invalid admin token.' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access denied. Admin session expired.' });
    }

    res.status(500).json({ message: 'Internal server error during authentication.' });
  }
};

module.exports = { adminAuth, adminOnlyAuth };
