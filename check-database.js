const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkDatabase() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get database stats
    const db = mongoose.connection.db;
    const stats = await db.stats();
    console.log('📊 Database Stats:');
    console.log(`   Database: ${db.databaseName}`);
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Data Size: ${(stats.dataSize / 1024).toFixed(2)} KB\n`);

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    console.log('');

    // Get all users
    const users = await User.find().select('-password');
    console.log('👥 Users in database:');
    console.log(`   Total users: ${users.length}\n`);

    if (users.length > 0) {
      users.forEach((user, index) => {
        console.log(`   User ${index + 1}:`);
        console.log(`     ID: ${user._id}`);
        console.log(`     Name: ${user.name}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Role: ${user.role}`);
        console.log(`     Phone: ${user.phone || 'Not provided'}`);
        console.log(`     Address: ${user.address || 'Not provided'}`);
        console.log(`     Created: ${user.createdAt}`);
        console.log('');
      });
    } else {
      console.log('   No users found in database');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase();
