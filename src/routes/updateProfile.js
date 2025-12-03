const express = require('express');
const User = require('../models/user');
const { protect } = require('../middleware/auth'); // your JWT middleware
const router = express.Router();

// UPDATE USER PROFILE
router.put('/update', protect, async (req, res) => {
  const { username, email } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      { username, email },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
