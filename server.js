const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`🔍 SERVER DEBUG - ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('🔍 SERVER DEBUG - Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('🔍 SERVER DEBUG - Body keys:', Object.keys(req.body));
    console.log('🔍 SERVER DEBUG - Body size:', JSON.stringify(req.body).length);
  }
  next();
});

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project';
console.log('🔍 DEBUG - Attempting to connect to MongoDB:', mongoUri.includes('mongodb.net') ? 'Atlas' : 'Local');

mongoose.connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('💡 TIP: If using Atlas, check IP whitelist. For local development, ensure MongoDB is installed and running.');
  });

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Donor Project API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'active',
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

// API info route
app.get('/api', (req, res) => {
  res.json({
    message: 'Donor Project API v1.0.0',
    endpoints: {
      auth: '/api/auth',
      cases: '/api/cases',
      donations: '/api/donations',
      admin: '/api/admin',
      adminCheckerMgmt: '/api/admin/checker-management',
      checker: '/api/checker',
      files: '/api/files',
      stats: '/api/stats',
      health: '/api/health',
    },
    documentation: 'See README.md for detailed API documentation',
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const caseRoutes = require('./routes/cases');
const donationRoutes = require('./routes/donations');
const adminRoutes = require('./routes/admin');
const adminCheckerMgmtRoutes = require('./routes/adminCheckerManagement');
const fileRoutes = require('./routes/files');
const statsRoutes = require('./routes/stats');
const checkerRoutes = require('./routes/checker');

// Import new admin routes
const adminAuthRoutes = require('./routes/adminAuth');
const adminDashboardRoutes = require('./routes/adminDashboard');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/admin', adminRoutes); // Keep existing admin routes for compatibility
app.use('/api/admin/checker-management', adminCheckerMgmtRoutes); // New checker management routes
app.use('/api/files', fileRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/checker', checkerRoutes); // New checker routes

// New secure admin routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
