const { pool } = require('../config/db');
const nodemailer = require('nodemailer');

exports.createAppointment = async (req, res) => {
    try {
        const { name, email, phone, doctorId, appt_date, appt_time, paymentId } = req.body;
        
        // Find doctor name
        let doctorName = req.body.doctor || 'Unknown Doctor';
        if (doctorId) {
            const [doctors] = await pool.query('SELECT name FROM doctors WHERE id = ?', [doctorId]);
            if (doctors.length > 0) doctorName = doctors[0].name;
        }

        // Prevent double booking
        const [existing] = await pool.query(
            'SELECT id FROM appointments WHERE doctor_id = ? AND appt_date = ? AND appt_time = ? AND status != \'cancelled\'',
            [doctorId, appt_date, appt_time]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'This time slot is already booked for this doctor. Please choose another time.' 
            });
        }

        const [result] = await pool.query(
            'INSERT INTO appointments (user_id, doctor_id, name, email, phone, doctor, appt_date, appt_time, paymentId, status, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, doctorId || null, name, email, phone, doctorName, appt_date, appt_time, paymentId, 'confirmed', req.body.amount || 500.00]
        );
        
        // Send email in background (no await)
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        transporter.sendMail({
            from: `"MediBook Pro" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Appointment Confirmed - MediBook Pro",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="background: #10b981; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px auto; line-height: 60px;">
                            ✓
                        </div>
                        <h2 style="color: #10b981; margin: 0;">Appointment Confirmed!</h2>
                    </div>
                    
                    <p>Hello <strong>${name}</strong>,</p>
                    <p>Your appointment has been successfully booked with MediBook Pro.</p>
                    
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #065f46; margin-top: 0;">Appointment Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>Reference ID:</strong></td>
                                <td style="padding: 8px 0;">MB${result.insertId.toString().padStart(4, '0')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>Doctor:</strong></td>
                                <td style="padding: 8px 0;">${doctorName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>Date:</strong></td>
                                <td style="padding: 8px 0;">${appt_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>Time:</strong></td>
                                <td style="padding: 8px 0;">${appt_time}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="text-align: center; color: #64748b; font-size: 14px; margin-top: 30px;">
                        Best regards,<br>
                        <strong>The MediBook Pro Team</strong>
                    </p>
                </div>
            `
        }).catch(err => console.error('Background Email Error:', err));

        res.status(201).json({ success: true, appointmentId: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getUserAppointments = async (req, res) => {
    try {
        const [appointments] = await pool.query('SELECT * FROM appointments WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json({ success: true, appointments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllAppointments = async (req, res) => {
    try {
        const [appointments] = await pool.query('SELECT * FROM appointments ORDER BY created_at DESC');
        res.json({ success: true, appointments, count: appointments.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const [result] = await pool.query('UPDATE appointments SET status = ? WHERE id = ?', ['cancelled', req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Appointment cancelled successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const [result] = await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteAppointment = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Appointment deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.checkBookedSlots = async (req, res) => {
    try {
        const { doctorId, date } = req.query;
        const [appointments] = await pool.query(
            'SELECT appt_time FROM appointments WHERE doctor_id = ? AND appt_date = ? AND status != \'cancelled\'',
            [doctorId, date]
        );
        const bookedSlots = appointments.map(appt => {
            // Format time to HH:mm
            const time = appt.appt_time;
            return typeof time === 'string' ? time.substring(0, 5) : time;
        });
        res.json({ success: true, bookedSlots });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
