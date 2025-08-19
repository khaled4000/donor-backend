const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testStatsAPI() {
    console.log('🧪 Testing Stats API...\n');

    try {
        // Test main stats endpoint
        console.log('1. Testing /api/stats endpoint...');
        const statsResponse = await axios.get(`${BASE_URL}/stats`);
        console.log('✅ Main stats response:', JSON.stringify(statsResponse.data, null, 2));
        
        // Test impact stats endpoint
        console.log('\n2. Testing /api/stats/impact endpoint...');
        const impactResponse = await axios.get(`${BASE_URL}/stats/impact`);
        console.log('✅ Impact stats response:', JSON.stringify(impactResponse.data, null, 2));
        
        // Test API info endpoint
        console.log('\n3. Testing /api endpoint...');
        const apiInfoResponse = await axios.get(`${BASE_URL}`);
        console.log('✅ API info response:', JSON.stringify(apiInfoResponse.data, null, 2));
        
        console.log('\n🎉 All tests passed! The Stats API is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testStatsAPI();
