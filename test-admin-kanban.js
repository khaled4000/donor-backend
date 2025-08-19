const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

async function testAdminKanban() {
  try {
    console.log('🧪 Testing Admin Kanban Board...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find or create a checker user
    let checker = await User.findOne({ role: 'checker' });
    if (!checker) {
      console.log('⚠️ No checker user found, creating one...');
      checker = new User({
        firstName: 'Admin',
        lastName: 'Checker',
        email: 'admin@donorproject.com',
        password: 'admin123',
        role: 'checker',
        userType: 'checker',
        phone: '+961-12-345678',
        address: 'Admin Office',
        emailVerified: true,
        isActive: true
      });
      await checker.save();
      console.log('✅ Created checker user');
    } else {
      console.log('✅ Found existing checker user');
    }
    
    console.log(`📧 Email: ${checker.email}`);
    console.log(`🔑 Password: admin123`);
    console.log(`👤 Role: ${checker.role}\n`);
    
    // Generate admin session token
    const adminToken = jwt.sign(
      {
        userId: checker._id,
        role: checker.role,
        email: checker.email,
        type: 'admin_session',
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '8h' }
    );
    
    console.log('🔑 Generated admin token');
    console.log('Token:', adminToken.substring(0, 50) + '...\n');
    
    // Test admin login endpoint
    console.log('🔍 Testing admin login...');
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/admin/auth/login', {
        username: checker.email,
        password: 'admin123'
      });
      console.log('✅ Admin login successful');
      console.log('Response:', loginResponse.data.message);
    } catch (loginError) {
      console.log('❌ Admin login failed:', loginError.response?.data?.message || loginError.message);
    }
    
    // Test Kanban board endpoint
    console.log('\n🔍 Testing Kanban board endpoint...');
    try {
      const kanbanResponse = await axios.get('http://localhost:5000/api/admin/cases/kanban', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      console.log('✅ Kanban board endpoint working!');
      console.log('Response:', kanbanResponse.data.message);
      console.log('Data structure:', Object.keys(kanbanResponse.data.data));
    } catch (kanbanError) {
      console.log('❌ Kanban board endpoint failed:');
      console.log('Status:', kanbanError.response?.status);
      console.log('Message:', kanbanError.response?.data?.message || kanbanError.message);
      if (kanbanError.response?.data) {
        console.log('Full error:', JSON.stringify(kanbanError.response.data, null, 2));
      }
    }
    
    // Test pending cases endpoint
    console.log('\n🔍 Testing pending cases endpoint...');
    try {
      const pendingResponse = await axios.get('http://localhost:5000/api/admin/cases/pending', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      console.log('✅ Pending cases endpoint working!');
      console.log('Response:', pendingResponse.data.message);
      console.log('Cases found:', pendingResponse.data.cases.length);
    } catch (pendingError) {
      console.log('❌ Pending cases endpoint failed:');
      console.log('Status:', pendingError.response?.status);
      console.log('Message:', pendingError.response?.data?.message || pendingError.message);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Failed to disconnect:', disconnectError.message);
    }
  }
}

testAdminKanban();
