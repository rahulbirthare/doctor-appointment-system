const { pool } = require('../config/db');
const nodemailer = require('nodemailer');

exports.getStats = async (req, res) => {
    try {
        const [totalRes] = await pool.query('SELECT COUNT(*) as count FROM appointments');
        const totalAppointments = totalRes[0].count;

        const todayStr = new Date().toISOString().split('T')[0];
        const [todayRes] = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE appt_date = ?', [todayStr]);
        const todayAppointments = todayRes[0].count;

        const [confirmedRes] = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE status = "confirmed"');
        const confirmedAppointments = confirmedRes[0].count;

        const [cancelledRes] = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE status = "cancelled"');
        const cancelledAppointments = cancelledRes[0].count;

        const [upcomingRes] = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE appt_date >= ?', [todayStr]);
        const upcomingAppointments = upcomingRes[0].count;
        
        // Find popular doctor
        const [doctorStats] = await pool.query('SELECT doctor, COUNT(*) as count FROM appointments GROUP BY doctor ORDER BY count DESC LIMIT 1');
        const popularDoctor = doctorStats.length > 0 ? doctorStats[0] : { doctor: 'None', count: 0 };

        // Real Chart Data
        // 1. Trend Data (Last 7 Days)
        const [trendData] = await pool.query(`
            SELECT appt_date as date, COUNT(*) as count 
            FROM appointments 
            WHERE appt_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY appt_date 
            ORDER BY appt_date ASC
        `);

        // 2. Specialty Data (Joined with doctors)
        const [specialtyData] = await pool.query(`
            SELECT d.specialty, COUNT(*) as count 
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            GROUP BY d.specialty
        `);

        // 3. Top Doctors Data
        const [topDoctors] = await pool.query(`
            SELECT doctor as name, COUNT(*) as count 
            FROM appointments 
            GROUP BY doctor 
            ORDER BY count DESC 
            LIMIT 5
        `);

        // Global Financial Stats
        const [revenueRes] = await pool.query('SELECT SUM(amount) as totalGross FROM appointments WHERE status != "cancelled"');
        const totalGross = parseFloat(revenueRes[0].totalGross || 0);
        const medibookRevenue = totalGross * 0.10;
        const totalDoctorSettlement = totalGross - medibookRevenue;

        const stats = {
            totalAppointments, todayAppointments, confirmedAppointments, cancelledAppointments, upcomingAppointments,
            cancellationRate: totalAppointments > 0 ? ((cancelledAppointments / totalAppointments) * 100).toFixed(1) : 0,
            popularDoctor,
            trendData,
            specialtyData,
            topDoctors,
            totalGross,
            medibookRevenue,
            totalDoctorSettlement
        };
        
        console.log('Dashboard Stats Generated:', stats);
        res.json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAppointments = async (req, res) => {
    try {
        const { search, date, doctor, status, limit = 20, page = 1 } = req.query;
        let queryStr = 'SELECT * FROM appointments WHERE 1=1';
        const params = [];
        
        if (date) { queryStr += ' AND appt_date = ?'; params.push(date); }
        if (doctor && doctor !== 'all') { queryStr += ' AND doctor = ?'; params.push(doctor); }
        if (status && status !== 'all') { queryStr += ' AND status = ?'; params.push(status); }
        if (search) {
            queryStr += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }
        
        queryStr += ' ORDER BY created_at DESC';
        
        const [allRows] = await pool.query(queryStr, params);
        const total = allRows.length;
        
        const skip = (page - 1) * limit;
        const pagedRows = allRows.slice(skip, skip + parseInt(limit));
        
        const appointments = pagedRows.map(a => {
            // MySQL dates might be Date objects
            const dDate = a.appt_date instanceof Date ? a.appt_date.toISOString().split('T')[0] : a.appt_date;
            return {
                id: a.id,
                name: a.name,
                email: a.email,
                phone: a.phone,
                doctor: a.doctor,
                appt_date: dDate,
                appt_time: a.appt_time,
                status: a.status,
                created_at: a.created_at,
                formatted_date: new Date(dDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                formatted_time: a.appt_time.substring(0, 5),
                booking_datetime: a.created_at
            };
        });

        res.json({
            success: true,
            appointments,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                hasNextPage: skip + parseInt(limit) < total,
                hasPrevPage: page > 1
            },
            filters: { doctors: [] }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAppointmentById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
        
        const a = rows[0];
        const dDate = a.appt_date instanceof Date ? a.appt_date.toISOString().split('T')[0] : a.appt_date;
        const appointment = {
            id: a.id, name: a.name, email: a.email, phone: a.phone,
            doctor: a.doctorName, formatted_date: dDate, formatted_time: a.appt_time, status: a.status
        };
        res.json({ success: true, appointment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateAppointment = async (req, res) => {
    try {
        const { name, email, phone, doctor, appt_date, appt_time, status } = req.body;
        const [result] = await pool.query(
            'UPDATE appointments SET name=?, email=?, phone=?, doctorName=?, appt_date=?, appt_time=?, status=? WHERE id=?',
            [name, email, phone, doctor, appt_date, appt_time, status, req.params.id]
        );
        
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendEmail = async (req, res) => {
    try {
        const { subject, message } = req.body;
        const [rows] = await pool.query('SELECT email FROM appointments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
        
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        
        await transporter.sendMail({
            from: `"MediBook Pro" <${process.env.EMAIL_USER}>`,
            to: rows[0].email,
            subject,
            html: `<p>${message.replace(/\n/g, '<br>')}</p>`
        });
        
        res.json({ success: true, message: 'Email sent' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Doctors Management
exports.getDoctors = async (req, res) => {
    try {
        const [doctors] = await pool.query('SELECT * FROM doctors ORDER BY created_at DESC');
        res.json({ success: true, doctors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addDoctor = async (req, res) => {
    try {
        const { name, email, password, specialty, experience, available, rating } = req.body;
        const [result] = await pool.query(
            'INSERT INTO doctors (name, email, password, specialty, experience, available, rating) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, password, specialty, experience, available !== undefined ? available : true, rating || 5.0]
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateDoctor = async (req, res) => {
    try {
        const { name, email, password, specialty, experience, available, rating } = req.body;
        const [result] = await pool.query(
            'UPDATE doctors SET name=?, email=?, password=?, specialty=?, experience=?, available=?, rating=? WHERE id=?',
            [name, email, password, specialty, experience, available, rating || 5.0, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteDoctor = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM doctors WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
