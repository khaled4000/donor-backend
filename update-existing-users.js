// Script to update existing users to be email verified
// This is needed because the email verification system was just implemented
// and existing users don't have the new fields set up

const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateExistingUsers() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Get all existing users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users in database`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.email} (${user.role})`);
      
      // Check if user needs updating
      if (user.emailVerified === undefined || user.emailVerified === false) {
        console.log(`  ⚠️  User needs email verification update`);
        
        // For admin/checker users, mark as verified immediately
        if (user.role === 'checker' || user.role === 'admin') {
          user.emailVerified = true;
          console.log(`  ✅ Marking ${user.role} as email verified`);
        } else {
          // For donor/family users, mark as verified for now
          // (you can change this to false if you want them to verify)
          user.emailVerified = true;
          console.log(`  ✅ Marking ${user.role} as email verified (existing user)`);
        }
        
        // Clear any existing verification tokens
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        
        await user.save();
        updatedCount++;
        console.log(`  💾 User updated successfully`);
      } else {
        console.log(`  ✅ User already has emailVerified: ${user.emailVerified}`);
      }
    }
    
    console.log(`\n🎉 Update complete! Updated ${updatedCount} users`);
    console.log('\n📋 Summary:');
    console.log('- Existing admin/checker users are now marked as verified');
    console.log('- Existing donor/family users are now marked as verified');
    console.log('- New users will still need email verification');
    console.log('\n💡 You can now log in with existing users');
    
  } catch (error) {
    console.error('❌ Error updating users:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the update
updateExistingUsers();
