const { pool } = require('../config/db');

exports.getDoctors = async (req, res) => {
    try {
        const [doctors] = await pool.query('SELECT * FROM doctors');
        
        // Map to expected format
        const mappedDoctors = doctors.map(d => ({
            ...d,
            _id: d.id, // For frontend compatibility
            available: d.available === 1
        }));
        
        res.json({ success: true, doctors: mappedDoctors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addDoctor = async (req, res) => {
    try {
        const { name, specialty, experience, available } = req.body;
        
        const [result] = await pool.query(
            'INSERT INTO doctors (name, specialty, experience, available) VALUES (?, ?, ?, ?)',
            [name, specialty, experience, available === undefined ? true : available]
        );
        
        res.status(201).json({ success: true, doctor: { id: result.insertId, name, specialty, experience } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateDoctor = async (req, res) => {
    try {
        const { name, specialty, experience, available } = req.body;
        
        const [result] = await pool.query(
            'UPDATE doctors SET name = ?, specialty = ?, experience = ?, available = ? WHERE id = ?',
            [name, specialty, experience, available, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        
        res.json({ success: true, message: 'Doctor updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteDoctor = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM doctors WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        
        res.json({ success: true, message: 'Doctor deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
