const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createChecker() {
  try {
    console.log('🔍 Creating checker user...');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project');
    console.log('✅ Connected to MongoDB');

   
    const existingChecker = await User.findOne({ 
      email: 'checker@donorproject.com' });
    if (existingChecker) {
      console.log('⚠️ Checker user already exists');
      console.log(`Email: ${existingChecker.email}`);
      console.log(`Role: ${existingChecker.role}`);
      await mongoose.disconnect();
      return;
    }

    // Create checker user
    const checker = new User({
      firstName: 'Admin',
      lastName: 'Checker',
      email: 'checker@donorproject.com',
      password: 'checker123', // This will be hashed automatically
      role: 'checker',
      userType: 'checker',
      phone: '+961-12-345678',
      address: 'Admin Office, Beirut, Lebanon',
    });

    await checker.save();

    console.log('✅ Checker user created successfully!');
    console.log('📧 Email: checker@donorproject.com');
    console.log('🔑 Password: checker123');
    console.log('👤 Role: checker');
    console.log('');
    console.log('You can now login with these credentials to access the admin panel.');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error creating checker user:', error.message);
    if (error.code === 11000) {
      console.log('💡 User with this email already exists');
    }
  }
}

createChecker();
