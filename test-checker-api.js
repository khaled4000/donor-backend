/**
 * Test script for Checker API endpoints
 * This script tests the checker functionality without requiring a full frontend setup
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testCheckerUser = {
  email: 'checker@example.com',
  password: 'testpassword123',
  firstName: 'John',
  lastName: 'Checker',
  userType: 'checker',
  role: 'checker'
};

let authToken = '';
let testCaseId = '';

async function testCheckerAPI() {
  console.log('🧪 Testing Checker API Endpoints...\n');

  try {
    // 1. Create a test checker user (if not exists)
    console.log('1. Creating test checker user...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testCheckerUser);
      console.log('✅ Test checker user created successfully');
      authToken = registerResponse.data.token;
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️  Test checker user already exists, logging in...');
        
        // Login with existing user
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: testCheckerUser.email,
          password: testCheckerUser.password
        });
        authToken = loginResponse.data.token;
        console.log('✅ Test checker user logged in successfully');
      } else {
        throw error;
      }
    }

    // 2. Test getting checker cases
    console.log('\n2. Testing GET /checker/cases...');
    const casesResponse = await axios.get(`${BASE_URL}/checker/cases`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Retrieved ${casesResponse.data.cases?.length || 0} cases`);
    
    if (casesResponse.data.cases && casesResponse.data.cases.length > 0) {
      testCaseId = casesResponse.data.cases[0].caseId;
      console.log(`📋 Using test case ID: ${testCaseId}`);
    }

    // 3. Test getting checker stats
    console.log('\n3. Testing GET /checker/stats...');
    const statsResponse = await axios.get(`${BASE_URL}/checker/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Retrieved checker statistics:', statsResponse.data.stats);

    // 4. Test getting individual case (if we have one)
    if (testCaseId) {
      console.log(`\n4. Testing GET /checker/cases/${testCaseId}...`);
      const caseResponse = await axios.get(`${BASE_URL}/checker/cases/${testCaseId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Retrieved individual case details');
      console.log(`   Case ID: ${caseResponse.data.case.caseId}`);
      console.log(`   Status: ${caseResponse.data.case.status}`);
      console.log(`   Family: ${caseResponse.data.case.familyData?.familyName || 'N/A'}`);

      // 5. Test self-assignment (if case is not assigned)
      if (!caseResponse.data.case.assignment) {
        console.log(`\n5. Testing POST /checker/cases/${testCaseId}/assign-to-me...`);
        const assignResponse = await axios.post(`${BASE_URL}/checker/cases/${testCaseId}/assign-to-me`, {
          notes: 'Test assignment for API verification'
        }, {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Case assigned to checker successfully');
      } else {
        console.log('\n5. ℹ️  Case already assigned, skipping assignment test');
      }

      // 6. Test case decision (approval)
      console.log(`\n6. Testing POST /checker/cases/${testCaseId}/decision...`);
      try {
        const decisionResponse = await axios.post(`${BASE_URL}/checker/cases/${testCaseId}/decision`, {
          decision: 'approved',
          comments: 'Test approval - case meets all criteria for assistance',
          finalDamagePercentage: 75,
          estimatedCost: 15000,
          fieldNotes: 'Verified damage through field visit. Family is in genuine need.'
        }, {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Case decision submitted successfully');
        console.log(`   Decision: ${decisionResponse.data.case.checkerDecision.decision}`);
        console.log(`   Estimated Cost: $${decisionResponse.data.case.checkerDecision.estimatedCost}`);
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('already has a decision')) {
          console.log('ℹ️  Case already has a decision, skipping decision test');
        } else {
          throw error;
        }
      }
    } else {
      console.log('\n4-6. ℹ️  No cases available for individual testing');
    }

    console.log('\n🎉 All Checker API tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ User authentication (register/login)');
    console.log('   ✅ Get checker cases');
    console.log('   ✅ Get checker statistics');
    if (testCaseId) {
      console.log('   ✅ Get individual case');
      console.log('   ✅ Case assignment');
      console.log('   ✅ Case decision submission');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  testCheckerAPI();
}

module.exports = { testCheckerAPI };
