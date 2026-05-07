const express = require('express');
const { getDoctors, addDoctor, updateDoctor, deleteDoctor } = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.route('/')
    .get(getDoctors)
    .post(protect, authorize('admin'), addDoctor);

router.route('/:id')
    .put(protect, authorize('admin'), updateDoctor)
    .delete(protect, authorize('admin'), deleteDoctor);

module.exports = router;
