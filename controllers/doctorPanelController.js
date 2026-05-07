const { pool } = require('../config/db');

// Get appointments for the logged-in doctor
exports.getMyAppointments = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const doctorName = req.user.name;

        // Fetch appointments where doctor matches the logged in doctor
        // We match by name since appointments table has doctor name as string, 
        // but we also have doctor_id in the appointments table (if it's linked)
        const [appointments] = await pool.query(
            'SELECT * FROM appointments WHERE doctor_id = ? OR doctor = ? ORDER BY appt_date DESC, appt_time DESC',
            [doctorId, doctorName]
        );

        res.json({
            success: true,
            appointments: appointments.map(a => ({
                ...a,
                formatted_date: a.appt_date instanceof Date ? a.appt_date.toISOString().split('T')[0] : a.appt_date,
                formatted_time: a.appt_time.substring(0, 5)
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update appointment status (e.g. mark as completed or cancelled)
exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const appointmentId = req.params.id;
        const doctorId = req.user.id;

        // Ensure the appointment belongs to this doctor
        const [rows] = await pool.query('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found' });
        
        if (rows[0].doctor_id !== doctorId && rows[0].doctor !== req.user.name) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this appointment' });
        }

        await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, appointmentId]);
        
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get stats for the doctor dashboard
exports.getDoctorStats = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const doctorName = req.user.name;

        const [totalRes] = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? OR doctor = ?', [doctorId, doctorName]);
        const [pendingRes] = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE (doctor_id = ? OR doctor = ?) AND status = "pending"', [doctorId, doctorName]);
        const [todayRes] = await pool.query(
            'SELECT COUNT(*) as count FROM appointments WHERE (doctor_id = ? OR doctor = ?) AND appt_date = CURDATE()',
            [doctorId, doctorName]
        );

        // Revenue calculation: Sum of amount for non-cancelled appointments
        const [revenueRes] = await pool.query(
            'SELECT SUM(amount) as totalRevenue FROM appointments WHERE (doctor_id = ? OR doctor = ?) AND status != "cancelled"',
            [doctorId, doctorName]
        );

        const totalRevenue = parseFloat(revenueRes[0].totalRevenue || 0);
        const medibookCharges = totalRevenue * 0.10;
        const finalSettlement = totalRevenue - medibookCharges;

        res.json({
            success: true,
            stats: {
                total: totalRes[0].count,
                pending: pendingRes[0].count,
                today: todayRes[0].count,
                totalRevenue,
                medibookCharges,
                finalSettlement
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
