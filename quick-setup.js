const mongoose = require('mongoose');
const User = require('./models/User');
const Case = require('./models/Case');
require('dotenv').config();

async function quickSetup() {
  try {
    console.log('🔧 Setting up admin system...');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project');
    console.log('✅ Connected to MongoDB');

    // Create checker if doesn't exist
    let checker = await User.findOne({ email: 'checker@donorproject.com' });
    if (!checker) {
      checker = new User({
        firstName: 'Admin',
        lastName: 'Checker',
        email: 'checker@donorproject.com',
        password: 'checker123',
        role: 'checker',
        userType: 'checker',
        phone: '+961-12-345678',
        address: 'Admin Office',
      });
      await checker.save();
      console.log('✅ Admin checker created:');
      console.log('   Email: checker@donorproject.com');
      console.log('   Password: checker123');
    } else {
      console.log('✅ Admin checker already exists');
    }

    // Create super admin if doesn't exist
    let superAdmin = await User.findOne({ email: 'superadmin@donorproject.com', role: 'admin' });
    if (!superAdmin) {
      superAdmin = new User({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@donorproject.com',
        password: 'admin123',
        role: 'admin',
        userType: 'admin',
        phone: '+961-98-765432',
        address: 'Head Office, Beirut, Lebanon',
        isActive: true,
        emailVerified: true,
        creationMethod: 'self_registration',
      });
      await superAdmin.save();
      console.log('✅ Super admin created:');
      console.log('   Email: superadmin@donorproject.com');
      console.log('   Password: admin123');
      console.log('   Role: admin (can manage checkers)');
    } else {
      console.log('✅ Super admin already exists');
    }

    // Check for existing cases
    const totalCases = await Case.countDocuments();
    const pendingCases = await Case.countDocuments({ status: 'submitted' });

    console.log(`📊 Cases in database: ${totalCases} total, ${pendingCases} pending`);

    if (pendingCases === 0) {
      console.log('⚠️  No pending cases found. The admin dashboard will appear empty.');
      console.log('💡 To test the admin dashboard:');
      console.log('   1. Register as a family user');
      console.log('   2. Submit a case through the family dashboard');
      console.log('   3. The case will appear in the admin dashboard for review');
    }

    await mongoose.disconnect();
    console.log('✅ Setup complete!');

  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }
}

quickSetup();
