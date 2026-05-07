const express = require('express');
const { getMyAppointments, updateAppointmentStatus, getDoctorStats } = require('../controllers/doctorPanelController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.use(authorize('doctor'));

router.get('/appointments', getMyAppointments);
router.put('/appointments/:id/status', updateAppointmentStatus);
router.get('/stats', getDoctorStats);

module.exports = router;
