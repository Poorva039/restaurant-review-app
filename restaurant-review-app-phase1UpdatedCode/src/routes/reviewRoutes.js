const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const Review = require("../models/Review");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/reviews - List with pagination & filtering
router.get("/", [
  // Validation rules for query parameters
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('perPage').optional().isInt({ min: 1, max: 100 }).withMessage('PerPage must be between 1 and 100'),
  query('minRating').optional().isInt({ min: 1, max: 5 }).withMessage('MinRating must be between 1 and 5'),
  query('city').optional().trim().isLength({ min: 1 }).withMessage('City must not be empty'),
  query('category').optional().trim().isLength({ min: 1 }).withMessage('Category must not be empty')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;
    const city = req.query.city;
    const minRating = parseInt(req.query.minRating);
    const category = req.query.category;
    
    let filter = {};
    if (city) {
      filter['location.city'] = new RegExp(city, 'i');
    }
    if (minRating) {
      filter.review_stars = { $gte: minRating };
    }
    if (category) {
      filter.categories = new RegExp(category, 'i');
    }
    
    const reviews = await Review.find(filter)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ review_date: -1 });
    
    const total = await Review.countDocuments(filter);
    const totalPages = Math.ceil(total / perPage);
    
    res.json({
      success: true,
      data: reviews,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET /api/reviews/:id - Single review
router.get("/:id", [
  // Validation rule for ID parameter
  param('id').isMongoId().withMessage('Invalid review ID')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ 
        success: false,
        message: "Review not found" 
      });
    }
    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// POST /api/reviews - Create new review
router.post("/", [
  // Authentication middleware
  protect,
  // Validation rules for request body
  body('business_name').notEmpty().withMessage('Business name is required'),
  body('user_name').notEmpty().withMessage('User name is required'),
  body('review_stars').isInt({ min: 1, max: 5 }).withMessage('Review stars must be between 1 and 5'),
  body('review_date').isISO8601().withMessage('Review date must be a valid date'),
  body('review_text').notEmpty().withMessage('Review text is required'),
  body('location.city').optional().notEmpty().withMessage('City must not be empty')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Add user_id from authenticated user
    const reviewData = {
      ...req.body,
      user_id: req.user.id
    };

    const review = new Review(reviewData);
    const savedReview = await review.save();
    
    res.status(201).json({
      success: true,
      data: savedReview
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        errors
      });
    }
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// PUT /api/reviews/:id - Update review
router.put("/:id", [
  // Authentication middleware
  protect,
  // Validation rules for parameters and body
  param('id').isMongoId().withMessage('Invalid review ID'),
  body('review_stars').optional().isInt({ min: 1, max: 5 }).withMessage('Review stars must be between 1 and 5'),
  body('review_text').optional().notEmpty().withMessage('Review text cannot be empty')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ 
        success: false,
        message: "Review not found" 
      });
    }

    // Authorization check - user must own the review or be admin
    if (review.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        errors
      });
    }
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// DELETE /api/reviews/:id - Delete review
router.delete("/:id", [
  // Authentication and authorization middleware
  protect,
  authorize('admin'), // Only admin can delete reviews
  // Validation rule for ID parameter
  param('id').isMongoId().withMessage('Invalid review ID')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const deletedReview = await Review.findByIdAndDelete(req.params.id);
    if (!deletedReview) {
      return res.status(404).json({ 
        success: false,
        message: "Review not found" 
      });
    }
    
    res.json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;