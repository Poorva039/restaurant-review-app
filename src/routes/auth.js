// src/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const { protect } = require('../middleware/auth'); // existing middleware in your project
const bcrypt = require('bcryptjs');

const router = express.Router();

/**
 * Helper: send token both as cookie and in JSON response
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });

  const cookieOptions = {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };

  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
};

// Register
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email or username' });
    }

    const user = await User.create({ username, email, password });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

/**
 * Update profile (username, email, optional avatar)
 * Protected route
 */
router.put('/update', protect, [
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 chars'),
  body('email').optional().isEmail().withMessage('Please include a valid email'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const updates = {};
    if (req.body.username) updates.username = req.body.username;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.avatarUrl) updates.avatarUrl = req.body.avatarUrl; // if you store avatar url

    // Prevent role escalation from client
    delete updates.role;

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');

    res.status(200).json({ success: true, user: updatedUser, message: 'Profile updated' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Change password
 * Body: { oldPassword, newPassword }
 */
router.put('/update-password', protect, [
  body('oldPassword').exists(),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 chars')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user || !(await user.correctPassword(oldPassword, user.password))) {
      return res.status(401).json({ success: false, message: 'Old password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
