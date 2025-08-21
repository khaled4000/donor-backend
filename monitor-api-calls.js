const mongoose = require('mongoose');
require('dotenv').config();

// Simple API call monitoring
let apiCallCounts = {};
let lastResetTime = Date.now();

// Function to log API calls
function logApiCall(endpoint, method = 'GET') {
  const key = `${method} ${endpoint}`;
  if (!apiCallCounts[key]) {
    apiCallCounts[key] = 0;
  }
  apiCallCounts[key]++;
  
  const now = Date.now();
  const timeSinceReset = now - lastResetTime;
  
  // Log every 10 calls or every 30 seconds
  if (apiCallCounts[key] % 10 === 0 || timeSinceReset > 30000) {
    console.log(`\n📊 API Call Statistics (${new Date().toLocaleTimeString()}):`);
    console.log(`   Time since reset: ${Math.round(timeSinceReset / 1000)}s`);
    
    Object.entries(apiCallCounts).forEach(([endpoint, count]) => {
      const callsPerMinute = Math.round((count / (timeSinceReset / 60000)) * 100) / 100;
      console.log(`   ${endpoint}: ${count} calls (${callsPerMinute}/min)`);
    });
    
    // Reset counters every 5 minutes
    if (timeSinceReset > 300000) {
      console.log('\n🔄 Resetting API call counters...');
      apiCallCounts = {};
      lastResetTime = now;
    }
  }
}

// Export the monitoring function
module.exports = { logApiCall };

// If run directly, show usage
if (require.main === module) {
  console.log('🔍 API Call Monitor');
  console.log('This script provides monitoring functions for API calls.');
  console.log('Import it in your routes to track API usage.');
  console.log('\nUsage:');
  console.log('  const { logApiCall } = require("./monitor-api-calls");');
  console.log('  logApiCall("/api/admin/cases/kanban", "GET");');
}
