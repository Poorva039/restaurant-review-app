const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Review = require('../models/Review');
const User = require('../models/user');

// @desc    Get dashboard stats and reviews
// @route   GET /api/dashboard
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's reviews with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    
    const totalReviews = await Review.countDocuments({ user_id: userId });
    const reviews = await Review.find({ user_id: userId })
      .sort({ review_date: -1 })
      .skip(skip)
      .limit(limit);
    
    // Calculate average rating
    const allReviews = await Review.find({ user_id: userId });
    const avgRating = allReviews.length > 0 
      ? (allReviews.reduce((sum, review) => sum + review.review_stars, 0) / allReviews.length).toFixed(1)
      : 0;
    
    // Stats
    const stats = {
      totalReviews,
      averageRating: avgRating
    };
    
    // Pagination info
    const pagination = {
      page,
      limit,
      totalPages: Math.ceil(totalReviews / limit),
      totalReviews
    };
    
    res.status(200).json({
      success: true,
      data: {
        stats,
        recentReviews: reviews,
        pagination
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete a review
// @route   DELETE /api/dashboard/reviews/:id
// @access  Private
router.delete('/reviews/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Make sure user owns the review or is admin
    if (review.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }
    
    await review.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user statistics for admin
// @route   GET /api/dashboard/admin/stats
// @access  Private/Admin
router.get('/admin/stats', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const totalUsers = await User.countDocuments();
    const totalReviews = await Review.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    
    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password');
    
    // Get recent reviews
    const recentReviews = await Review.find()
      .sort({ review_date: -1 })
      .limit(5)
      .populate('user_id', 'username email');
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalReviews,
        totalAdmins,
        recentUsers,
        recentReviews
      }
    });
    
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;