const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testApprovedCasesAPI() {
    console.log('🧪 Testing Approved Cases API...\n');

    try {
        // Test the new approved cases endpoint
        console.log('1. Testing /api/cases/approved endpoint...');
        const response = await axios.get(`${BASE_URL}/cases/approved`);
        console.log('✅ Approved cases response:', JSON.stringify(response.data, null, 2));
        
        // Test with pagination
        console.log('\n2. Testing /api/cases/approved with pagination...');
        const paginatedResponse = await axios.get(`${BASE_URL}/cases/approved?page=1&limit=5`);
        console.log('✅ Paginated response:', JSON.stringify(paginatedResponse.data, null, 2));
        
        console.log('\n🎉 Approved Cases API test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testApprovedCasesAPI();

