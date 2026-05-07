const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

exports.protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        let user;
        if (decoded.role === 'doctor') {
            const [doctors] = await pool.query('SELECT id, name, email FROM doctors WHERE id = ?', [decoded.id]);
            if (doctors.length > 0) {
                user = { ...doctors[0], role: 'doctor' };
            }
        } else {
            const [users] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
            if (users.length > 0) {
                user = users[0];
            }
        }
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized for this role' });
        }
        next();
    };
};
