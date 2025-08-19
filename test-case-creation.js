const mongoose = require('mongoose');
const User = require('./models/User');
const Case = require('./models/Case');
require('dotenv').config();

async function testCaseCreation() {
    try {
        console.log('🧪 Testing Case Creation...\n');
        
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
        
        // Test case creation
        console.log('2️⃣ Testing case creation...');
        const caseData = {
            userId: testUser._id,
            userEmail: testUser.email,
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
                destructionDate: new Date('2023-10-07'),
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
            uploadedFiles: [],
            status: 'draft'
        };
        
        const testCase = new Case(caseData);
        
        // Calculate form completion
        testCase.calculateFormCompletion();
        console.log(`📊 Form completion: ${testCase.formCompletion}%`);
        
        // Save the case
        await testCase.save();
        console.log(`✅ Case created successfully!`);
        console.log(`📋 Case ID: ${testCase.caseId}`);
        console.log(`📊 Status: ${testCase.status}`);
        console.log(`📅 Created: ${testCase.createdAt}`);
        console.log(`🔄 Last Modified: ${testCase.lastModified}\n`);
        
        // Test retrieving the case
        console.log('3️⃣ Testing case retrieval...');
        const retrievedCase = await Case.findById(testCase._id);
        if (retrievedCase) {
            console.log(`✅ Case retrieved successfully`);
            console.log(`📋 Case ID: ${retrievedCase.caseId}`);
            console.log(`👨‍👩‍👧‍👦 Family: ${retrievedCase.familyData.familyName}`);
            console.log(`🏘️ Village: ${retrievedCase.familyData.village}`);
        }
        
        // Clean up test data
        console.log('\n4️⃣ Cleaning up test data...');
        await Case.findByIdAndDelete(testCase._id);
        await User.findByIdAndDelete(testUser._id);
        console.log('✅ Test data cleaned up');
        
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        console.log('\n🎉 All tests passed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Try to disconnect
        try {
            await mongoose.disconnect();
        } catch (disconnectError) {
            console.error('Failed to disconnect:', disconnectError.message);
        }
    }
}

testCaseCreation();
