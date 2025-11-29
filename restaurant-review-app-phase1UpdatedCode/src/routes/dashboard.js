const express = require('express');
const { protect } = require('../middleware/auth');
const { getDashboardData, deleteReview } = require('../controllers/dashboardController');

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/dashboard - Get dashboard data
router.get('/', getDashboardData);

// DELETE /api/dashboard/reviews/:reviewId - Delete user's review
router.delete('/reviews/:reviewId', deleteReview);

module.exports = router;