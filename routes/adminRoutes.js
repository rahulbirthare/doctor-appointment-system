const express = require('express');
const { getStats, getAppointments, getAppointmentById, updateAppointment, sendEmail, getDoctors, addDoctor, updateDoctor, deleteDoctor } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getStats);
router.get('/appointments', getAppointments);
router.get('/appointments/:id', getAppointmentById);
router.put('/appointments/:id', updateAppointment);
router.post('/appointments/:id/send-email', sendEmail);

// Doctor management
router.get('/doctors', getDoctors);
router.post('/doctors', addDoctor);
router.put('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', deleteDoctor);

module.exports = router;
