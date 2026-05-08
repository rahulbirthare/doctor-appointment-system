require('dotenv').config();
const { initializeDb } = require('../config/db');

async function testConnection() {
    console.log('Testing connection to Aiven MySQL...');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('Port:', process.env.DB_PORT);
    
    try {
        const connection = await initializeDb();
        console.log('Successfully connected and initialized tables on Aiven!');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Failed to connect to Aiven:', err.message);
        process.exit(1);
    }
}

testConnection();
