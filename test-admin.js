const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testAdminAuth() {
    try {
        console.log('🧪 Testing Admin Authentication...');
        
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project');
        console.log('✅ Connected to MongoDB');

        // Find admin user
        const admin = await User.findOne({ email: 'admin@donorproject.com', role: 'checker' });
        if (!admin) {
            console.log('❌ Admin user not found');
            console.log('💡 Run: node quick-setup.js to create admin user');
            return;
        }

        console.log('✅ Admin user found:', {
            id: admin._id,
            email: admin.email,
            role: admin.role,
            isActive: admin.isActive
        });

        // Test JWT token generation
        const token = jwt.sign(
            { 
                userId: admin._id, 
                role: admin.role, 
                email: admin.email,
                type: 'admin_session'
            },
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: '8h' }
        );

        console.log('✅ JWT token generated successfully');
        console.log('🔑 Token (first 50 chars):', token.substring(0, 50) + '...');

        // Test token verification
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
        console.log('✅ Token verification successful:', {
            userId: decoded.userId,
            role: decoded.role,
            type: decoded.type
        });

        await mongoose.disconnect();
        console.log('✅ Test completed successfully!');
        console.log('');
        console.log('📋 Admin Login Credentials:');
        console.log('   Email: admin@donorproject.com');
        console.log('   Password: admin123');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAdminAuth();
