const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test admin credentials (existing checker user)
const ADMIN_CREDENTIALS = {
  username: 'checker@donorproject.com',
  password: 'checker123'
};

async function testAdminCheckerManagement() {
  console.log('🧪 Testing Admin Checker Management API...\n');

  try {
    let adminToken = '';

    // 1. Admin Login
    console.log('1. Testing admin login...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/admin/auth/login`, ADMIN_CREDENTIALS);
      adminToken = loginResponse.data.token;
      console.log('✅ Admin login successful');
      console.log('   Admin:', loginResponse.data.admin.name, '|', loginResponse.data.admin.email);
    } catch (error) {
      console.error('❌ Admin login failed:', error.response?.data?.message || error.message);
      return;
    }

    const authHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };

    // 2. Get Checker Statistics
    console.log('\n2. Testing GET /admin/checker-management/checkers/stats/overview...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/admin/checker-management/checkers/stats/overview`, {
        headers: authHeaders
      });
      console.log('✅ Checker statistics retrieved');
      console.log('   Stats:', JSON.stringify(statsResponse.data.stats, null, 2));
    } catch (error) {
      console.error('❌ Failed to get checker stats:', error.response?.data?.message || error.message);
    }

    // 3. Get All Checkers
    console.log('\n3. Testing GET /admin/checker-management/checkers...');
    try {
      const checkersResponse = await axios.get(`${BASE_URL}/admin/checker-management/checkers`, {
        headers: authHeaders
      });
      console.log('✅ Checkers list retrieved');
      console.log(`   Found ${checkersResponse.data.checkers.length} checkers`);
      
      if (checkersResponse.data.checkers.length > 0) {
        console.log('   Sample checker:', {
          name: checkersResponse.data.checkers[0].name,
          email: checkersResponse.data.checkers[0].email,
          isActive: checkersResponse.data.checkers[0].isActive,
          creationMethod: checkersResponse.data.checkers[0].creationMethod
        });
      }
    } catch (error) {
      console.error('❌ Failed to get checkers:', error.response?.data?.message || error.message);
    }

    // 4. Create New Checker
    console.log('\n4. Testing POST /admin/checker-management/checkers...');
    const newCheckerData = {
      firstName: 'Test',
      lastName: 'Checker',
      username: 'testchecker001',
      email: `testchecker${Date.now()}@example.com`,
      password: 'testpass123',
      phone: '+961-12-345678',
      address: 'Test Address, Lebanon',
      sendNotification: false // Don't send email in test
    };

    let createdCheckerId = null;
    try {
      const createResponse = await axios.post(`${BASE_URL}/admin/checker-management/checkers`, newCheckerData, {
        headers: authHeaders
      });
      createdCheckerId = createResponse.data.checker.id;
      console.log('✅ New checker created successfully');
      console.log('   Created checker:', createResponse.data.checker.name, '|', createResponse.data.checker.email);
      console.log('   Credentials provided:', createResponse.data.credentials);
    } catch (error) {
      console.error('❌ Failed to create checker:', error.response?.data?.message || error.message);
      console.error('   Errors:', error.response?.data?.errors);
    }

    // 5. Get Specific Checker Details
    if (createdCheckerId) {
      console.log(`\n5. Testing GET /admin/checker-management/checkers/${createdCheckerId}...`);
      try {
        const checkerDetailsResponse = await axios.get(`${BASE_URL}/admin/checker-management/checkers/${createdCheckerId}`, {
          headers: authHeaders
        });
        console.log('✅ Checker details retrieved');
        console.log('   Checker name:', checkerDetailsResponse.data.checker.name);
        console.log('   Statistics:', checkerDetailsResponse.data.checker.statistics);
      } catch (error) {
        console.error('❌ Failed to get checker details:', error.response?.data?.message || error.message);
      }

      // 6. Update Checker
      console.log(`\n6. Testing PUT /admin/checker-management/checkers/${createdCheckerId}...`);
      try {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Checker',
          phone: '+961-87-654321',
          address: 'Updated Address, Lebanon'
        };
        const updateResponse = await axios.put(`${BASE_URL}/admin/checker-management/checkers/${createdCheckerId}`, updateData, {
          headers: authHeaders
        });
        console.log('✅ Checker updated successfully');
        console.log('   Updated checker:', updateResponse.data.checker.name);
      } catch (error) {
        console.error('❌ Failed to update checker:', error.response?.data?.message || error.message);
      }

      // 7. Toggle Checker Status
      console.log(`\n7. Testing PATCH /admin/checker-management/checkers/${createdCheckerId}/status...`);
      try {
        const statusResponse = await axios.patch(`${BASE_URL}/admin/checker-management/checkers/${createdCheckerId}/status`, 
          { isActive: false }, 
          { headers: authHeaders }
        );
        console.log('✅ Checker status toggled successfully');
        console.log('   Status:', statusResponse.data.checker.isActive ? 'Active' : 'Inactive');
      } catch (error) {
        console.error('❌ Failed to toggle checker status:', error.response?.data?.message || error.message);
      }

      // 8. Delete Checker
      console.log(`\n8. Testing DELETE /admin/checker-management/checkers/${createdCheckerId}...`);
      try {
        const deleteResponse = await axios.delete(`${BASE_URL}/admin/checker-management/checkers/${createdCheckerId}`, {
          headers: authHeaders
        });
        console.log('✅ Checker deleted successfully');
        console.log('   Deleted checker:', deleteResponse.data.deletedChecker.name);
      } catch (error) {
        console.error('❌ Failed to delete checker:', error.response?.data?.message || error.message);
      }
    }

    // 9. Test Error Cases
    console.log('\n9. Testing error cases...');
    
    // Try to create checker with duplicate email
    try {
      await axios.post(`${BASE_URL}/admin/checker-management/checkers`, {
        firstName: 'Duplicate',
        lastName: 'Checker',
        email: 'checker@donorproject.com', // Existing email
        password: 'password123'
      }, { headers: authHeaders });
      console.log('❌ Should have failed with duplicate email');
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('email')) {
        console.log('✅ Correctly rejected duplicate email');
      } else {
        console.error('❌ Unexpected error for duplicate email:', error.response?.data?.message);
      }
    }

    // Try to access without admin token
    try {
      await axios.get(`${BASE_URL}/admin/checker-management/checkers`);
      console.log('❌ Should have failed without admin token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected request without admin token');
      } else {
        console.error('❌ Unexpected error for no token:', error.response?.data?.message);
      }
    }

    console.log('\n🎉 Admin Checker Management API tests completed!');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run the tests
testAdminCheckerManagement();
