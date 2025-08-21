// Add this temporary debugging code to your server.js to find the problematic route

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173', // Development
      'http://localhost:3000', // Alternative development port
      'https://donor-frontend-jszc-git-master-khaled4000s-projects.vercel.app', // Vercel frontend
      process.env.FRONTEND_URL // Production frontend URL (fallback)
    ].filter(Boolean); // Remove undefined values
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Payload limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`🔍 SERVER DEBUG - ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project';
mongoose.connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Nahdat Watan | نهضة وطن API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'active',
    maxPayloadSize: '50MB'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    maxPayloadSize: '50MB'
  });
});

// ROUTE DEBUGGING: Add each route file one by one to isolate the problem
console.log('🔍 Loading routes...');

try {
  console.log('📁 Loading auth routes...');
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
  console.error('Stack:', error.stack);
}

try {
  console.log('📁 Loading case routes...');
  const caseRoutes = require('./routes/cases');
  app.use('/api/cases', caseRoutes);
  console.log('✅ Case routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading case routes:', error.message);
  console.error('Stack:', error.stack);
}

try {
  console.log('📁 Loading donation routes...');
  const donationRoutes = require('./routes/donations');
  app.use('/api/donations', donationRoutes);
  console.log('✅ Donation routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading donation routes:', error.message);
  console.error('Stack:', error.stack);
}

try {
  console.log('📁 Loading admin routes...');
  const adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading admin routes:', error.message);
  console.error('Stack:', error.stack);
}

try {
  console.log('📁 Loading admin checker management routes...');
  const adminCheckerMgmtRoutes = require('./routes/adminCheckerManagement');
  app.use('/api/admin/checker-management', adminCheckerMgmtRoutes);
  console.log('✅ Admin checker management routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading admin checker management routes:', error.message);
  console.error('Stack:', error.stack);
}

try {
  console.log('📁 Loading file routes...');
  const fileRoutes = require('./routes/files');
  app.use('/api/files', fileRoutes);
  console.log('✅ File routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading file routes:', error.message);
  console.error('Stack:', error.stack);
}

try {
  console.log('📁 Loading stats routes...');
  const statsRoutes = require('./routes/stats');
  app.use('/api/stats', statsRoutes);
  console.log('✅ Stats routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading stats routes:', error.message);
  console.error('Stack:', error.stack);
}

try {
  console.log('📁 Loading checker routes...');
  const checkerRoutes = require('./routes/checker');
  app.use('/api/checker', checkerRoutes);
  console.log('✅ Checker routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading checker routes:', error.message);
  console.error('Stack:', error.stack);
}

// Try loading additional admin routes if they exist
try {
  console.log('📁 Loading admin auth routes...');
  const adminAuthRoutes = require('./routes/adminAuth');
  app.use('/api/admin/auth', adminAuthRoutes);
  console.log('✅ Admin auth routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading admin auth routes (might not exist):', error.message);
}

try {
  console.log('📁 Loading admin dashboard routes...');
  const adminDashboardRoutes = require('./routes/adminDashboard');
  app.use('/api/admin/dashboard', adminDashboardRoutes);
  console.log('✅ Admin dashboard routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading admin dashboard routes (might not exist):', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ SERVER ERROR:', err.stack);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      message: 'Payload too large. Maximum size is 50MB.',
      maxSize: '50MB',
      error: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  res.status(500).json({ 
    message: 'Internal server error occurred',
    error: 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📋 All routes loaded successfully!`);
});

// COMMON ROUTE PATTERNS TO CHECK IN YOUR ROUTE FILES:

/* 
Check these files for invalid route patterns:

1. routes/auth.js - Look for:
   - router.get('/verify/:')  // Missing parameter name
   - router.post('/reset-password/:token:') // Extra colon
   
2. routes/cases.js - Look for:
   - router.get('/:caseId/comments/:') // Missing parameter name
   - router.get('/::id') // Double colon
   
3. routes/admin.js - Look for:
   - router.get('/cases/:caseId/:') // Missing parameter name
   
4. routes/adminCheckerManagement.js - Look for:
   - router.get('/checkers/:checkerId/:') // Missing parameter name
   
5. Any route file - Look for patterns like:
   - /:$/  (ending with colon)
   - /::/  (double colon)
   - /?/   (question mark in route path instead of query)
   - /#/   (hash in route path)

TO FIX: Replace the above server.js temporarily and run your server.
The console will show exactly which route file is causing the problem.
*/