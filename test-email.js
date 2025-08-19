// backend/test-email.js
require('dotenv').config();
const emailService = require('./utils/emailService');

async function testEmail() {
  try {
    console.log('🧪 Testing email service...');
    console.log('📧 Checking email configuration...');
    
    // Check environment variables
    console.log('\n🔍 Environment Variables:');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT SET');
    console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');
    console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
    
    const testUser = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      // Mock the generateEmailVerificationToken method
      generateEmailVerificationToken: function() {
        return 'test-token-123';
      },
      save: async function() {
        console.log('💾 Mock user save called');
        return true;
      }
    };
    
    console.log('\n�� Attempting to send verification email...');
    const result = await emailService.sendVerificationEmail(testUser);
    
    // Test the URL generation directly
    const verificationEmail = emailService.generateVerificationEmail(testUser, 'test-token-123');
    console.log('\n🔗 Generated verification URL:');
    console.log('URL:', verificationEmail.html.match(/href="([^"]+)"/)?.[1] || 'URL not found in HTML');
    
    if (result) {
      console.log('\n✅ Email test successful!');
      console.log('�� Verification email sent successfully');
      console.log('\n💡 Your email configuration is working correctly!');
    } else {
      console.log('\n❌ Email test failed - no result returned');
    }
    
  } catch (error) {
    console.error('\n❌ Email test failed with error:');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    // Check common issues
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 TIP: Check your EMAIL_USER and EMAIL_PASS in .env file');
      console.log('�� TIP: Make sure you\'re using an App Password, not your regular Gmail password');
    } else if (error.message.includes('Connection timeout')) {
      console.log('\n💡 TIP: Check your internet connection and EMAIL_HOST/EMAIL_PORT');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n�� TIP: Make sure you\'re using an App Password, not your regular Gmail password');
    } else if (error.message.includes('nodemailer')) {
      console.log('\n💡 TIP: Run "npm install nodemailer" to install the required package');
    }
  }
}

testEmail();