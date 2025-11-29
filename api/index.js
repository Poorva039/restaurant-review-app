// api/index.js - Express app for Vercel

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Load env variables
dotenv.config();

// DB + models
const connectDB = require('../src/config/db');
const Review = require('../src/models/Review');

// Routers
const authRoutes = require('../src/routes/auth');
const reviewRoutes = require('../src/routes/reviewRoutes');
const dashboardRoutes = require('../src/routes/dashboard');
const uploadRoutes = require('../src/routes/upload');

const app = express();

/* --------------------- Express basic setup --------------------- */

// EJS views (your .ejs files are in /views at project root)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies & session
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-session-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// Static files (optional public folder)
app.use(express.static(path.join(__dirname, '../public')));

/* --------------------- Page routes (views) --------------------- */

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

app.get('/profile', (req, res) => {
  res.render('profile');
});

app.get('/add-review', (req, res) => {
  res.render('add-review');
});

app.get('/my-reviews', (req, res) => {
  res.render('my-reviews');
});

app.get('/my-reviews/:id', (req, res) => {
  res.render('my-review-details');
});

app.get('/my-reviews/:id/edit', (req, res) => {
  res.render('edit-review');
});

app.get('/browse', (req, res) => {
  res.render('browse');
});

/**
 * SSR page for a single review
 * URL: /reviews/:id
 */
app.get('/reviews/:id', async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).send('Review not found');
      // or render a 404 view if you create one:
      // return res.status(404).render('404', { message: 'Review not found' });
    }

    res.render('review-details', { review });
  } catch (err) {
    next(err);
  }
});

/**
 * SSR page for a restaurant (grouped by business_name)
 * URL: /restaurants/:name
 */
app.get('/restaurants/:name', async (req, res, next) => {
  try {
    const businessName = decodeURIComponent(req.params.name);

    const reviews = await Review.find({ business_name: businessName }).sort({
      review_date: -1,
    });

    if (!reviews.length) {
      return res.status(404).send('Restaurant not found');
      // or render('404', { message: 'Restaurant not found' });
    }

    const totalReviews = reviews.length;
    const avgRating =
      reviews.reduce((sum, r) => sum + r.review_stars, 0) / totalReviews;

    // Use the first review for restaurant info
    const restaurant = reviews[0];

    res.render('restaurant', {
      restaurant,
      reviews,
      avgRating: Number(avgRating.toFixed(1)),
      totalReviews,
    });
  } catch (err) {
    next(err);
  }
});

/* --------------------- API routes --------------------- */

// JSON APIs under /api/...
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);

/* --------------------- 404 + error handlers --------------------- */

app.use((req, res) => {
  // simple 404 (no 404.ejs yet)
  res.status(404).send('Page not found');
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  if (res.headersSent) return next(err);

  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }

  res.status(500).send('Server Error');
});

/* --------------------- Vercel handler export --------------------- */

// NO app.listen() here!
// Vercel calls this function for each request.
module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB in handler:', err);
    return res.status(500).send('Database connection error');
  }

  return app(req, res);
};
