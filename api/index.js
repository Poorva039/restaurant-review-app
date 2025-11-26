const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Database connection
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (!mongoURI) {
        console.error("❌ MongoDB URI not found in environment variables");
        return;
      }
      await mongoose.connect(mongoURI);
      console.log("✅ MongoDB Connected (Vercel)");
    }
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
  }
};

// Import routes
const authRoutes = require("../src/routes/auth");
const reviewRoutes = require("../src/routes/reviewRoutes");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewRoutes);

// Serve static views
app.get("/", (req, res) => {
  res.render('home');
});

app.get("/login", (req, res) => {
  res.render('login');
});

app.get("/register", (req, res) => {
  res.render('register');
});

app.get("/dashboard", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Dashboard</h1>
        <p>Welcome! This is your dashboard.</p>
        <button onclick="localStorage.removeItem('token'); window.location.href='/'">Logout</button>
      </body>
    </html>
  `);
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    await connectDB();
    res.json({ 
      success: true, 
      message: "Server is running", 
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "API is working!",
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Server Error'
  });
});

// Connect to DB when function starts
connectDB();

module.exports = app;