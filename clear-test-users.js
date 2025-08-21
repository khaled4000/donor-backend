const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function clearTestUsers() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find test users (excluding admin accounts)
    const testUsers = await User.find({
      role: { $in: ['donor', 'family'] },
      email: { 
        $in: [
          'khaled.kassem.lb@gmail.com',
          'omarmassoud20012@gmail.com', 
          'khaledkssem246@gmail.com'
        ]
      }
    });

    if (testUsers.length === 0) {
      console.log('ℹ️ No test users found to clear');
      return;
    }

    console.log(`📋 Found ${testUsers.length} test users to clear:`);
    testUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });

    // Delete test users
    const result = await User.deleteMany({
      role: { $in: ['donor', 'family'] },
      email: { 
        $in: [
          'khaled.kassem.lb@gmail.com',
          'omarmassoud20012@gmail.com', 
          'khaledkssem246@gmail.com'
        ]
      }
    });

    console.log(`\n🗑️ Deleted ${result.deletedCount} test users`);
    console.log('✅ Database cleared successfully');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Add confirmation prompt
console.log('⚠️ WARNING: This will delete test users from the database!');
console.log('Test users to be deleted:');
console.log('   - khaled.kassem.lb@gmail.com (family)');
console.log('   - omarmassoud20012@gmail.com (family)');
console.log('   - khaledkssem246@gmail.com (donor)');
console.log('\nTo proceed, uncomment the line below and run the script again:');

// Uncomment the line below to actually run the script
// clearTestUsers();
