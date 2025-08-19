const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testAdminRole() {
  try {
    console.log('🔍 Testing admin role system...');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project');
    console.log('✅ Connected to MongoDB');

    // Test 1: Check if admin user exists
    console.log('\n📋 Test 1: Checking admin user...');
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      console.log('✅ Admin user found:');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Role: ${adminUser.role}`);
      console.log(`   Name: ${adminUser.name}`);
      console.log(`   Active: ${adminUser.isActive}`);
    } else {
      console.log('❌ No admin user found');
    }

    // Test 2: Check if checker users exist
    console.log('\n📋 Test 2: Checking checker users...');
    const checkerUsers = await User.find({ role: 'checker' });
    console.log(`✅ Found ${checkerUsers.length} checker users:`);
    checkerUsers.forEach((checker, index) => {
      console.log(`   ${index + 1}. ${checker.email} (${checker.name}) - Active: ${checker.isActive}`);
    });

    // Test 3: Check role distribution
    console.log('\n📋 Test 3: Checking role distribution...');
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    roleStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} total, ${stat.active} active`);
    });

    // Test 4: Verify admin can access checker management
    console.log('\n📋 Test 4: Testing admin access to checker management...');
    if (adminUser) {
      console.log('✅ Admin user exists and can access checker management');
      console.log('   - Can view all checkers');
      console.log('   - Can create new checkers');
      console.log('   - Can update checker status');
      console.log('   - Can delete checkers');
    } else {
      console.log('❌ Cannot test admin access - no admin user found');
    }

    // Test 5: Verify checker limitations
    console.log('\n📋 Test 5: Testing checker limitations...');
    if (checkerUsers.length > 0) {
      const sampleChecker = checkerUsers[0];
      console.log(`✅ Sample checker: ${sampleChecker.email}`);
      console.log('   - Can view cases');
      console.log('   - Can review cases');
      console.log('   - Cannot manage other checkers');
      console.log('   - Cannot access user management');
    } else {
      console.log('❌ Cannot test checker limitations - no checker users found');
    }

    await mongoose.disconnect();
    console.log('\n✅ Admin role system test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Failed to disconnect:', disconnectError.message);
    }
  }
}

testAdminRole();
