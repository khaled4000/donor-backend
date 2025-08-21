#!/usr/bin/env node

/**
 * Test Production Configuration
 * Run this script to verify your backend is ready for production deployment
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('🧪 Testing Production Configuration...\n');

// Test 1: Environment Variables
console.log('1️⃣ Checking Environment Variables:');
const requiredVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'FRONTEND_URL'
];

const emailVars = [
  'SENDGRID_API_KEY',
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASS'
];

let missingVars = [];
let emailServiceConfigured = false;

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}: SET`);
  } else {
    console.log(`   ❌ ${varName}: NOT SET`);
    missingVars.push(varName);
  }
});

// Check if at least one email service is configured
if (process.env.SENDGRID_API_KEY) {
  console.log('   ✅ SENDGRID_API_KEY: SET (SendGrid configured)');
  emailServiceConfigured = true;
} else {
  console.log('   ❌ SENDGRID_API_KEY: NOT SET');
}

let smtpConfigured = true;
emailVars.slice(1).forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}: SET`);
  } else {
    console.log(`   ❌ ${varName}: NOT SET`);
    smtpConfigured = false;
  }
});

if (smtpConfigured) {
  console.log('   ✅ SMTP Email Service: CONFIGURED');
  emailServiceConfigured = true;
} else {
  console.log('   ❌ SMTP Email Service: INCOMPLETE');
}

// Test 2: Database Connection
console.log('\n2️⃣ Testing Database Connection:');
if (process.env.MONGODB_URI) {
  const mongoUri = process.env.MONGODB_URI;
  
  // Test if it's a valid MongoDB URI
  if (mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://')) {
    console.log('   ✅ MONGODB_URI format: VALID');
    
    // Test actual connection
    mongoose.connect(mongoUri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => {
      console.log('   ✅ Database connection: SUCCESSFUL');
      console.log('   ✅ Database ready for production');
      
      // Close connection
      mongoose.connection.close();
      
      // Final assessment
      console.log('\n🎯 FINAL ASSESSMENT:');
      if (missingVars.length === 0 && emailServiceConfigured) {
        console.log('   🚀 Your backend is READY for Render deployment!');
        console.log('\n   Next steps:');
        console.log('   1. Push your code to GitHub');
        console.log('   2. Connect to Render');
        console.log('   3. Set environment variables in Render dashboard');
        console.log('   4. Deploy!');
      } else {
        console.log('   ⚠️  Your backend needs configuration before deployment:');
        if (missingVars.length > 0) {
          console.log(`      - Missing required variables: ${missingVars.join(', ')}`);
        }
        if (!emailServiceConfigured) {
          console.log('      - Email service not configured');
        }
        console.log('\n   See DEPLOYMENT_CHECKLIST.md for setup instructions');
      }
    })
    .catch(err => {
      console.log('   ❌ Database connection: FAILED');
      console.log(`      Error: ${err.message}`);
      console.log('\n   🚨 Database connection failed. Check your MONGODB_URI');
    });
  } else {
    console.log('   ❌ MONGODB_URI format: INVALID');
    console.log('   Expected format: mongodb:// or mongodb+srv://');
  }
} else {
  console.log('   ❌ MONGODB_URI: NOT SET');
}

// Test 3: JWT Secret Strength
console.log('\n3️⃣ Checking JWT Secret:');
if (process.env.JWT_SECRET) {
  const secret = process.env.JWT_SECRET;
  if (secret.length >= 32) {
    console.log('   ✅ JWT_SECRET length: STRONG (32+ characters)');
  } else {
    console.log('   ⚠️  JWT_SECRET length: WEAK (less than 32 characters)');
    console.log('      Consider using a longer secret for production');
  }
} else {
  console.log('   ❌ JWT_SECRET: NOT SET');
}

// Test 4: Frontend URL
console.log('\n4️⃣ Checking Frontend URL:');
if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl.startsWith('https://')) {
    console.log('   ✅ FRONTEND_URL: HTTPS (production ready)');
  } else if (frontendUrl.startsWith('http://')) {
    console.log('   ⚠️  FRONTEND_URL: HTTP (consider HTTPS for production)');
  } else {
    console.log('   ❌ FRONTEND_URL: INVALID format');
  }
} else {
  console.log('   ❌ FRONTEND_URL: NOT SET');
}

console.log('\n📋 Configuration Test Complete!');
console.log('Check the results above to see if you\'re ready for deployment.');
