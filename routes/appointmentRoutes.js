const express = require('express');
const { createAppointment, getUserAppointments, getAllAppointments, cancelAppointment, updateStatus, deleteAppointment, checkBookedSlots } = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/', protect, createAppointment);
router.get('/check-slots', checkBookedSlots);
router.get('/user', protect, getUserAppointments);
router.get('/all-appointments', protect, getAllAppointments);

router.put('/:id/cancel', protect, cancelAppointment);
router.put('/:id/status', protect, authorize('admin'), updateStatus);
router.delete('/:id', protect, authorize('admin'), deleteAppointment);

module.exports = router;
