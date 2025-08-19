const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

async function testAPIWithToken() {
    try {
        console.log('🧪 Testing API with JWT Token...\n');
        
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');
        
        // Create a verified test user
        console.log('1️⃣ Creating verified test user...');
        const testUser = new User({
            firstName: 'Test',
            lastName: 'Family',
            email: 'testfamily@example.com',
            password: 'password123',
            role: 'family',
            userType: 'family',
            phone: '+961-12-345678',
            emailVerified: true, // Set as verified
            isActive: true
        });
        
        // Hash the password
        await testUser.save();
        console.log(`✅ Test user created: ${testUser.email} (ID: ${testUser._id})\n`);
        
        // Generate JWT token
        console.log('2️⃣ Generating JWT token...');
        const token = jwt.sign(
            { 
                userId: testUser._id, 
                role: testUser.role, 
                email: testUser.email,
                emailVerified: true
            },
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: '24h' }
        );
        console.log(`✅ JWT token generated: ${token.substring(0, 50)}...\n`);
        
        // Test the API endpoint
        console.log('3️⃣ Testing case creation API endpoint...');
        const caseData = {
            familyData: {
                familyName: 'Test Family',
                headOfHousehold: 'Test Head',
                phoneNumber: '+961-12-345678',
                numberOfMembers: 4,
                childrenCount: 2,
                elderlyCount: 1,
                specialNeedsCount: 0,
                village: 'Tyre',
                currentAddress: '123 Current St, Tyre',
                originalAddress: '456 Original St, Tyre',
                propertyType: 'house',
                ownershipStatus: 'owned',
                propertyValue: 50000,
                destructionDate: '2023-10-07',
                destructionCause: 'Bombing',
                destructionPercentage: 75,
                damageDescription: 'House severely damaged in bombing',
                previouslyReceivedAid: 'no',
                aidDetails: '',
                witnessName: 'John Doe',
                witnessPhone: '+961-12-345679',
                emergencyContact: 'Jane Doe',
                emergencyPhone: '+961-12-345680'
            },
            uploadedFiles: []
        };
        
        const response = await axios.post('http://localhost:5000/api/cases', caseData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ API call successful!');
        console.log(`📊 Status: ${response.status}`);
        console.log(`📋 Case ID: ${response.data.case.caseId}`);
        console.log(`📊 Form Completion: ${response.data.case.formCompletion}%`);
        console.log(`🔄 Response:`, JSON.stringify(response.data, null, 2));
        
        // Clean up test data
        console.log('\n4️⃣ Cleaning up test data...');
        await User.findByIdAndDelete(testUser._id);
        console.log('✅ Test user cleaned up');
        
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        console.log('\n🎉 All tests passed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.response) {
            console.error('❌ Response status:', error.response.status);
            console.error('❌ Response data:', error.response.data);
        }
        
        console.error('❌ Full error:', error);
        
        // Try to disconnect
        try {
            await mongoose.disconnect();
        } catch (disconnectError) {
            console.error('Failed to disconnect:', disconnectError.message);
        }
    }
}

testAPIWithToken();
