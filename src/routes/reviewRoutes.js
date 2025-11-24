const express = require("express");
const router = express.Router();

// test route for Phase 0
router.get("/", (req, res) => {
  res.json({ message: "List of reviews (Phase 0 placeholder)" });
});

module.exports = router;
