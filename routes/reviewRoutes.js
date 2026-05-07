const express = require('express');
const { createReview, getReviews, deleteReview } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/', protect, createReview);
router.get('/', getReviews);
router.delete('/:id', protect, authorize('admin'), deleteReview);

module.exports = router;
