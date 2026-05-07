const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initializeDb() {
    // Connect to MySQL server first to create the database if it doesn't exist
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '12345'
    });

    await connection.query("CREATE DATABASE IF NOT EXISTS `doctor_app`");
    await connection.changeUser({ database: 'doctor_app' });

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

    // Ensure email and password columns exist (for existing tables)
    const addColumn = async (columnQuery) => {
        try {
            await connection.query(columnQuery);
        } catch (err) {
            if (err.errno !== 1060) { // 1060 is "Duplicate column name"
                console.error('Error adding column:', err.message);
            }
        }
    };

    await addColumn('ALTER TABLE doctors ADD COLUMN email VARCHAR(255) UNIQUE');
    await addColumn('ALTER TABLE doctors ADD COLUMN password VARCHAR(255)');

    // Ensure rating has a default (fix for existing tables)
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

    await addColumn('ALTER TABLE appointments ADD COLUMN amount DECIMAL(10, 2) DEFAULT 500.00');

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
}

// We will export a pool for the app to use
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '12345',
    database: 'doctor_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = { pool, initializeDb };
