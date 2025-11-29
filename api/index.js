// api/index.js – Express app for Vercel

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Load env vars (Vercel also injects them from dashboard)
dotenv.config();

// ==== DB connection ====
require('../src/config/db'); // uses MONGODB_URI

// Models (for server-rendered pages)
const Review = require('../src/models/Review');

// Routes (JSON APIs)
const authRoutes = require('../src/routes/auth');
const reviewRoutes = require('../src/routes/reviewRoutes');
const dashboardRoutes = require('../src/routes/dashboard');
const uploadRoutes = require('../src/routes/upload');

const app = express();

// ==== View engine (EJS) ====
app.set('view engine', 'ejs');
// index.js is in /api, views are in project root /views
app.set('views', path.join(__dirname, '../views'));

// ==== Middlewares ====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
  })
);

// Static files (if you add a public/ directory)
app.use(express.static(path.join(__dirname, '../public')));

// ==== API routes ====
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);

// ==== Page routes (render EJS) ====

// Public pages
app.get('/', (req, res) => res.render('home'));
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));

// Auth-protected pages (the front-end JS checks localStorage token)
app.get('/dashboard', (req, res) => res.render('dashboard'));
app.get('/profile', (req, res) => res.render('profile'));

app.get('/add-review', (req, res) => res.render('add-review'));
app.get('/my-reviews', (req, res) => res.render('my-reviews'));
app.get('/my-reviews/:id', (req, res) => res.render('my-review-details'));
app.get('/my-reviews/:id/edit', (req, res) => res.render('edit-review'));

app.get('/browse', (req, res) => res.render('browse'));

// Server-rendered review details (used by /browse → /reviews/:id)
app.get('/reviews/:id', async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).render('review-details', {
        review: null,
      });
    }
    res.render('review-details', { review });
  } catch (err) {
    next(err);
  }
});

// Restaurant page that aggregates reviews by business_name
app.get('/restaurants/:name', async (req, res, next) => {
  try {
    const businessName = decodeURIComponent(req.params.name);

    const reviews = await Review.find({ business_name: businessName });

    if (!reviews.length) {
      return res.status(404).render('restaurant', {
        restaurant: { business_name: businessName },
        avgRating: 0,
        totalReviews: 0,
        reviews: [],
      });
    }

    const restaurant = reviews[0]; // basic info from first review
    const totalReviews = reviews.length;
    const avgRating =
      reviews.reduce((sum, r) => sum + (r.review_stars || 0), 0) /
      totalReviews;

    res.render('restaurant', {
      restaurant,
      avgRating: Number(avgRating.toFixed(1)),
      totalReviews,
      reviews,
    });
  } catch (err) {
    next(err);
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).render('home'); // or a dedicated 404.ejs if you create one
});

// Error handler (to avoid plain 500 JSON in Vercel)
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (res.headersSent) return next(err);
  res.status(500).send('Internal Server Error');
});

// ==== Export app for Vercel ====
// DO NOT call app.listen() here.
module.exports = app;
