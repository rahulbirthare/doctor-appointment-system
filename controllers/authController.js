const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        // Check if user exists
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Insert user
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role || 'user']
        );
        
        const user = { id: result.insertId, name, email, role: role || 'user' };
        
        res.status(201).json({
            success: true,
            user,
            token: generateToken(user.id, user.role)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const userWithoutPassword = { id: user.id, name: user.name, email: user.email, role: user.role };
        
        res.json({
            success: true,
            user: userWithoutPassword,
            token: generateToken(user.id, user.role)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.doctorLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const [doctors] = await pool.query('SELECT * FROM doctors WHERE email = ?', [email]);
        const doctor = doctors[0];
        
        // Using plain text comparison as requested by user ("shown the id password" in admin)
        if (!doctor || doctor.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid doctor credentials' });
        }
        
        const doctorInfo = { id: doctor.id, name: doctor.name, email: doctor.email, role: 'doctor' };
        
        res.json({
            success: true,
            user: doctorInfo,
            token: generateToken(doctor.id, 'doctor')
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
