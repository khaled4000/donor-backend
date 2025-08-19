const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test data
const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    role: 'family',
    phone: '+961-12-345678'
};

const testDonor = {
    firstName: 'Test',
    lastName: 'Donor',
    email: `donor${Date.now()}@example.com`,
    password: 'password123',
    role: 'donor',
    phone: '+961-12-345679'
};

let userToken = '';
let donorToken = '';
let caseId = '';

async function testAPI() {
    try {
        console.log('🧪 Starting API Tests...\n');

        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await axios.get(`${API_BASE}/health`);
        console.log(`✅ Health Status: ${healthResponse.data.status}`);
        console.log(`📊 Database: ${healthResponse.data.database}\n`);

        // Test 2: User Registration (Family)
        console.log('2️⃣ Testing User Registration (Family)...');
        const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
        userToken = registerResponse.data.token;
        console.log(`✅ Family User Registered: ${registerResponse.data.user.name}`);
        console.log(`🎫 Token received: ${userToken.substring(0, 20)}...\n`);

        // Test 3: User Registration (Donor)
        console.log('3️⃣ Testing User Registration (Donor)...');
        const donorRegisterResponse = await axios.post(`${API_BASE}/auth/register`, testDonor);
        donorToken = donorRegisterResponse.data.token;
        console.log(`✅ Donor User Registered: ${donorRegisterResponse.data.user.name}`);
        console.log(`🎫 Token received: ${donorToken.substring(0, 20)}...\n`);

        // Test 4: User Login
        console.log('4️⃣ Testing User Login...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        console.log(`✅ Login Successful: ${loginResponse.data.user.name}\n`);

        // Test 5: Get Profile
        console.log('5️⃣ Testing Get Profile...');
        const profileResponse = await axios.get(`${API_BASE}/auth/profile`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log(`✅ Profile Retrieved: ${profileResponse.data.user.name}\n`);

        // Test 6: Create Case
        console.log('6️⃣ Testing Case Creation...');
        const caseData = {
            familyData: {
                familyName: 'Test Family',
                headOfHousehold: 'Test Head',
                phoneNumber: '+961-12-345678',
                numberOfMembers: 4,
                village: 'Tyre',
                currentAddress: '123 Current St, Tyre',
                originalAddress: '456 Original St, Tyre',
                destructionDate: '2023-10-07',
                destructionPercentage: 75,
                damageDescription: 'House severely damaged in bombing',
                propertyType: 'house',
                ownershipStatus: 'owned',
                previouslyReceivedAid: 'no'
            },
            uploadedFiles: []
        };

        const caseResponse = await axios.post(`${API_BASE}/cases`, caseData, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        caseId = caseResponse.data.case.caseId;
        console.log(`✅ Case Created: ${caseId}`);
        console.log(`📊 Form Completion: ${caseResponse.data.case.formCompletion}%\n`);

        // Test 7: Get My Cases
        console.log('7️⃣ Testing Get My Cases...');
        const myCasesResponse = await axios.get(`${API_BASE}/cases/my-cases`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log(`✅ Cases Retrieved: ${myCasesResponse.data.cases.length} cases\n`);

        // Test 8: Submit Case
        console.log('8️⃣ Testing Case Submission...');
        const submitResponse = await axios.post(`${API_BASE}/cases/${caseId}/submit`, {}, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log(`✅ Case Submitted: ${submitResponse.data.case.status}\n`);

        // Test 9: Get Verified Cases (as Donor)
        console.log('9️⃣ Testing Get Verified Cases (Donor)...');
        const verifiedCasesResponse = await axios.get(`${API_BASE}/cases/verified/list`, {
            headers: { Authorization: `Bearer ${donorToken}` }
        });
        console.log(`✅ Verified Cases Retrieved: ${verifiedCasesResponse.data.cases.length} cases\n`);

        // Test 10: Get Villages
        console.log('🔟 Testing Get Villages...');
        const villagesResponse = await axios.get(`${API_BASE}/admin/villages`);
        console.log(`✅ Villages Retrieved: ${villagesResponse.data.villages.length} villages\n`);

        console.log('🎉 All API tests completed successfully!');
        console.log('\n📋 Test Summary:');
        console.log(`👤 Test Family User: ${testUser.email}`);
        console.log(`💰 Test Donor User: ${testDonor.email}`);
        console.log(`📁 Test Case ID: ${caseId}`);
        console.log('\n💡 You can now test the frontend integration with these users.');

    } catch (error) {
        console.error('❌ API Test Failed:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Message: ${error.response.data.message}`);
            if (error.response.data.fields) {
                console.error('Validation Errors:', error.response.data.fields);
            }
        } else {
            console.error('Error:', error.message);
        }
        
        // Check if server is running
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Make sure the server is running: npm run dev');
        }
    }
}

// Check if axios is available, if not provide installation instruction
try {
    testAPI();
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('axios')) {
        console.error('❌ axios is not installed. Please run: npm install axios');
    } else {
        console.error('❌ Unexpected error:', error.message);
    }
}