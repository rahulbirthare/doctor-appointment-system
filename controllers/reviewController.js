const { pool } = require('../config/db');

exports.createReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const name = req.user.name; // From protect middleware
        const userId = req.user.id;

        const [result] = await pool.query(
            'INSERT INTO reviews (user_id, name, rating, comment) VALUES (?, ?, ?, ?)',
            [userId, name, rating, comment]
        );

        res.status(201).json({ success: true, reviewId: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getReviews = async (req, res) => {
    try {
        const [reviews] = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
        res.json({ success: true, reviews });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
