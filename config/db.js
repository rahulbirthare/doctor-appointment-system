const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '12345',
    database: process.env.DB_NAME || 'doctor_app',
    port: parseInt(process.env.DB_PORT) || 3306,
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
    } : null
};

async function initializeDb() {
    let connection;
    try {
        console.log(`Attempting to connect to database at ${dbConfig.host}:${dbConfig.port}...`);
        console.log(`SSL Enabled: ${process.env.DB_SSL === 'true'}`);
        
        // Connect to MySQL server
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            port: dbConfig.port,
            ssl: dbConfig.ssl
        });

        // Try to create database if it doesn't exist (might fail on some managed hosts)
        try {
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
        } catch (dbErr) {
            console.log('Note: Could not create database (may already exist or insufficient permissions):', dbErr.message);
        }

        await connection.changeUser({ database: dbConfig.database });
        console.log('Connected to MySQL Database.');

        // Create users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create doctors table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS doctors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                specialty VARCHAR(255) NOT NULL,
                experience VARCHAR(255) NOT NULL,
                rating DECIMAL(3, 1) DEFAULT 5.0,
                available BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Helper to add columns safely
        const addColumn = async (tableName, columnQuery) => {
            try {
                await connection.query(columnQuery);
            } catch (err) {
                if (err.errno !== 1060) { // 1060 is "Duplicate column name"
                    console.error(`Error adding column to ${tableName}:`, err.message);
                }
            }
        };

        await addColumn('doctors', 'ALTER TABLE doctors ADD COLUMN email VARCHAR(255) UNIQUE');
        await addColumn('doctors', 'ALTER TABLE doctors ADD COLUMN password VARCHAR(255)');
        await connection.query('ALTER TABLE doctors MODIFY COLUMN rating DECIMAL(3, 1) NOT NULL DEFAULT 5.0');

        // Create appointments table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                doctor_id INT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                doctor VARCHAR(255) NOT NULL,
                appt_date DATE NOT NULL,
                appt_time TIME NOT NULL,
                status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
                paymentId VARCHAR(255),
                amount DECIMAL(10, 2) DEFAULT 500.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
            )
        `);

        await addColumn('appointments', 'ALTER TABLE appointments ADD COLUMN amount DECIMAL(10, 2) DEFAULT 500.00');

        // Create reviews table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                name VARCHAR(255) NOT NULL,
                rating INT NOT NULL,
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // Seed Admin User
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@medibook.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const [existingAdmin] = await connection.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
        if (existingAdmin.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);
            await connection.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Admin User', adminEmail, hashedPassword, 'admin']
            );
            console.log(`Admin user created: ${adminEmail}`);
        }

        console.log('All MySQL Tables verified/created.');
        return connection;
    } catch (err) {
        console.error('Database Initialization Failed:', err.message);
        throw err;
    }
}

// We will export a pool for the app to use
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = { pool, initializeDb };

