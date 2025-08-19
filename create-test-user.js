const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createTestUser() {
    try {
        console.log('🔧 Creating verified test user for development...\n');
        
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');
        
        // Check if test user already exists
        const existingUser = await User.findOne({ email: 'test@family.com' });
        if (existingUser) {
            console.log('ℹ️ Test user already exists, updating verification status...');
            existingUser.emailVerified = true;
            existingUser.isActive = true;
            await existingUser.save();
            console.log('✅ Test user updated successfully');
            console.log(`📧 Email: ${existingUser.email}`);
            console.log(`🔑 Password: password123`);
            console.log(`✅ Email verified: ${existingUser.emailVerified}`);
            console.log(`🟢 Active: ${existingUser.isActive}`);
        } else {
            // Create new test user
            const testUser = new User({
                firstName: 'Test',
                lastName: 'Family',
                email: 'test@family.com',
                password: 'password123',
                role: 'family',
                userType: 'family',
                phone: '+961-12-345678',
                emailVerified: true,
                isActive: true
            });
            
            await testUser.save();
            console.log('✅ Test user created successfully');
            console.log(`📧 Email: ${testUser.email}`);
            console.log(`🔑 Password: password123`);
            console.log(`✅ Email verified: ${testUser.emailVerified}`);
            console.log(`🟢 Active: ${testUser.isActive}`);
        }
        
        await mongoose.disconnect();
        console.log('\n🎉 Test user ready for development!');
        console.log('\n📝 Login credentials:');
        console.log('   Email: test@family.com');
        console.log('   Password: password123');
        console.log('\n💡 Use these credentials to test the family dashboard');
        
    } catch (error) {
        console.error('❌ Failed to create test user:', error.message);
        try {
            await mongoose.disconnect();
        } catch (disconnectError) {
            console.error('Failed to disconnect:', disconnectError.message);
        }
    }
}

createTestUser();
