const Review = require('../models/Review');
const User = require('../models/user');

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's reviews with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // Get user's total review count
    const totalReviews = await Review.countDocuments({ user_id: userId });
    
    // Get user's recent reviews
    const recentReviews = await Review.find({ user_id: userId })
      .sort({ review_date: -1 })
      .skip(skip)
      .limit(limit)
      .select('business_name review_stars review_date review_text');

    // Calculate average rating
    const averageRatingResult = await Review.aggregate([
      { $match: { user_id: userId } },
      { $group: { _id: null, avgRating: { $avg: '$review_stars' } } }
    ]);
    
    const averageRating = averageRatingResult.length > 0 
      ? Math.round(averageRatingResult[0].avgRating * 10) / 10 
      : 0;

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role
        },
        stats: {
          totalReviews,
          averageRating,
          recentReviewsCount: recentReviews.length
        },
        recentReviews,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review or is admin
    if (review.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting review'
    });
  }
};