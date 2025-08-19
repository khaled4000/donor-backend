const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    console.log('🔍 Creating admin user...');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project');
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      email: 'admin@donorproject.com' });
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Role: ${existingAdmin.role}`);
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const admin = new User({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@donorproject.com',
      password: 'admin123', // This will be hashed automatically
      role: 'admin',
      userType: 'admin',
      phone: '+961-98-765432',
      address: 'Head Office, Beirut, Lebanon',
      isActive: true,
      emailVerified: true,
      creationMethod: 'self_registration',
    });

    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: superadmin@donorproject.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: admin');
    console.log('');
    console.log('You can now login with these credentials to access the admin panel.');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 11000) {
      console.log('💡 User with this email already exists');
    }
  }
}

createAdmin();
