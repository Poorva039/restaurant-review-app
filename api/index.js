const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// connect DB if not already connected
if (!mongoose.connection.readyState) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected (Vercel function)"))
    .catch((err) => console.error("❌ MongoDB error:", err));
}

app.use(express.json());

// test route for Vercel
app.get("/", (req, res) => {
  res.send("Hello from Express on Vercel! Backend is running.");
});

// your API routes
const reviewRoutes = require("../src/routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);

// export handler for Vercel
module.exports = app;
