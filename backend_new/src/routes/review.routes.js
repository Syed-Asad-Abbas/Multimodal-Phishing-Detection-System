const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const auth = require('../middlewares/auth');

// Public
router.get('/testimonials', reviewController.getTestimonials);

// User
router.post('/', auth(), reviewController.createReview);
router.get('/my', auth(), reviewController.getMyReviews);

// Admin (Needs ADMIN role)
router.get('/admin/all', auth('ADMIN'), reviewController.getAllReviews);
router.put('/admin/:id/status', auth('ADMIN'), reviewController.updateStatus);

module.exports = router;
