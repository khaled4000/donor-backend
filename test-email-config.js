#!/usr/bin/env node

/**
 * Test Email Configuration
 * This script tests your email service configuration
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🧪 Testing Email Configuration...\n');

// Test 1: Environment Variables
console.log('1️⃣ Checking Environment Variables:');
const emailVars = [
  'EMAIL_HOST',
  'EMAIL_USER', 
  'EMAIL_PASS',
  'EMAIL_FROM',
  'EMAIL_PORT',
  'FRONTEND_URL'
];

let missingVars = [];
emailVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}: SET`);
    if (varName === 'EMAIL_PASS') {
      console.log(`      Value: ${process.env[varName].substring(0, 4)}...`);
    } else {
      console.log(`      Value: ${process.env[varName]}`);
    }
  } else {
    console.log(`   ❌ ${varName}: NOT SET`);
    missingVars.push(varName);
  }
});

// Test 2: Email Transporter Creation
console.log('\n2️⃣ Testing Email Transporter:');
try {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  console.log('   ✅ Email transporter created successfully');
  console.log(`   📧 Host: ${process.env.EMAIL_HOST}`);
  console.log(`   📧 Port: ${process.env.EMAIL_PORT || 587}`);
  console.log(`   📧 User: ${process.env.EMAIL_USER}`);
  console.log(`   📧 From: ${process.env.EMAIL_FROM}`);
  
} catch (error) {
  console.log(`   ❌ Failed to create transporter: ${error.message}`);
}

// Test 3: Test Email Sending
console.log('\n3️⃣ Testing Email Sending:');
if (missingVars.length === 0) {
  console.log('   📧 Attempting to send test email...');
  
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  const testEmail = {
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_USER, // Send to yourself for testing
    subject: 'Test Email - Donor Project Backend',
    html: `
      <h2>Test Email from Donor Project Backend</h2>
      <p>This is a test email to verify your email configuration.</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
      <p><strong>Frontend URL:</strong> ${process.env.FRONTEND_URL || 'Not set'}</p>
    `
  };
  
  transporter.sendMail(testEmail)
    .then(info => {
      console.log('   ✅ Test email sent successfully!');
      console.log(`   📧 Message ID: ${info.messageId}`);
      console.log(`   📧 Response: ${info.response}`);
    })
    .catch(error => {
      console.log('   ❌ Failed to send test email:');
      console.log(`      Error: ${error.message}`);
      
      if (error.code === 'EAUTH') {
        console.log('      💡 This usually means incorrect email credentials');
        console.log('      💡 Check your EMAIL_USER and EMAIL_PASS');
        console.log('      💡 For Gmail, make sure you\'re using an App Password');
      } else if (error.code === 'ECONNECTION') {
        console.log('      💡 This usually means connection issues');
        console.log('      💡 Check your EMAIL_HOST and EMAIL_PORT');
      }
    });
} else {
  console.log('   ⚠️  Cannot test email sending - missing environment variables');
}

// Test 4: Frontend URL for Email Verification
console.log('\n4️⃣ Checking Frontend URL for Email Verification:');
if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl.startsWith('https://')) {
    console.log('   ✅ FRONTEND_URL: HTTPS (production ready)');
  } else if (frontendUrl.startsWith('http://')) {
    console.log('   ⚠️  FRONTEND_URL: HTTP (consider HTTPS for production)');
  } else {
    console.log('   ❌ FRONTEND_URL: INVALID format');
  }
  
  // Test verification URL generation
  const testToken = 'test_token_123';
  const testEmail = 'test@example.com';
  const verificationUrl = `${frontendUrl}/verify-email?token=${testToken}&email=${testEmail}`;
  console.log(`   🔗 Sample verification URL: ${verificationUrl}`);
  
} else {
  console.log('   ❌ FRONTEND_URL: NOT SET');
  console.log('   💡 This is required for email verification links');
}

// Final Assessment
console.log('\n🎯 FINAL ASSESSMENT:');
if (missingVars.length === 0) {
  console.log('   ✅ All email environment variables are set');
  console.log('   🚀 Your email service should work correctly');
  console.log('\n   Next steps:');
  console.log('   1. Test user registration with email verification');
  console.log('   2. Check your email inbox for verification emails');
  console.log('   3. Verify the verification links work correctly');
} else {
  console.log('   ⚠️  Email configuration incomplete:');
  console.log(`      Missing: ${missingVars.join(', ')}`);
  console.log('\n   Please set the missing environment variables and run this test again');
}

console.log('\n📋 Email Configuration Test Complete!');
