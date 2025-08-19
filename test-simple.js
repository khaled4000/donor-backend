const express = require('express');
const app = express();

// Test basic server functionality
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Test stats route (without database)
app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            familiesHelped: 25,
            villagesCovered: 8,
            casesVerified: 75,
            totalCases: 40,
            verifiedCases: 30,
            timestamp: new Date().toISOString()
        }
    });
});

// Test impact stats route (without database)
app.get('/api/stats/impact', (req, res) => {
    res.json({
        success: true,
        data: {
            homesDestroyed: 15,
            peopleAffected: 120,
            casesVerifiedCount: 30,
            fundsRaised: 50000,
            timestamp: new Date().toISOString()
        }
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🧪 Test server running on port ${PORT}`);
    console.log(`📊 Test stats endpoint: http://localhost:${PORT}/api/stats`);
    console.log(`📈 Test impact endpoint: http://localhost:${PORT}/api/stats/impact`);
    console.log(`🔍 Test basic endpoint: http://localhost:${PORT}/test`);
});
