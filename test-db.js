const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('Testing MongoDB connection...');
        console.log('Connection string:', process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project');
        
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/donor-project');
        
        console.log('✅ MongoDB connected successfully!');
        
        // Test creating a collection
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        await mongoose.disconnect();
        console.log('✅ Connection test completed successfully!');
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.log('\nTroubleshooting tips:');
        console.log('1. Make sure MongoDB is running');
        console.log('2. Check your .env file has the correct MONGODB_URI');
        console.log('3. If using Atlas, verify your IP is whitelisted');
        console.log('4. Check your username/password in the connection string');
    }
}

testConnection(); 