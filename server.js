// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

dotenv.config();

const User = require('./src/models/user');

// Route files
const auth = require('./src/routes/auth');
const reviewRoutes = require('./src/routes/reviewRoutes');
const dashboardRoutes = require('./src/routes/dashboard');
const Review = require('./src/models/Review');
const uploadRoutes = require('./src/routes/upload');

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser middleware
app.use(cookieParser());

// Set view engine with correct path
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// CORS (optional) - uncomment if frontend separate domain
// const cors = require('cors');
// app.use(cors({ origin: true, credentials: true }));

/**
 * MongoDB connect helper for serverless environments:
 * caches connection in global to avoid reconnect on each lambda invocation.
 */
async function connectToDatabase() {
  if (global._mongoClientPromise) {
    return global._mongoClientPromise;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable not set');
  }

  // use mongoose.connect which returns a promise
  global._mongoClientPromise = mongoose.connect(mongoUri, {
    // options (mongoose 6+ has sensible defaults)
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  }).then((conn) => {
    console.log('MongoDB Connected Successfully');
    return conn;
  }).catch(err => {
    // clear cached promise on failure
    global._mongoClientPromise = null;
    throw err;
  });

  return global._mongoClientPromise;
}

/**
 * Create initial admin if not exists (only when ADMIN env provided)
 */
const createInitialAdmin = async () => {
  try {
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      console.log('Admin env vars not provided — skipping initial admin creation.');
      return;
    }

    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const adminUser = await User.create({
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL || `${process.env.ADMIN_USERNAME}@example.com`,
        password: process.env.ADMIN_PASSWORD,
        role: 'admin'
      });
      console.log('Initial admin user created:', adminUser.username);
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
};

/* Connect DB on startup (or when serverless cold start) */
connectToDatabase()
  .then(() => createInitialAdmin())
  .catch(err => console.error('MongoDB connection error:', err.message));

// Mount routers (API routes)
app.use('/api/auth', auth);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);

// Basic route
app.get('/', (req, res) => {
  res.render('home');
});

// Authentication middleware used by server-rendered pages
const authenticatePage = async (req, res, next) => {
  try {
    // Accept token from cookie, Authorization header or query string
    let token = req.cookies?.token ||
                (req.headers.authorization && req.headers.authorization.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null) ||
                req.query?.token;

    if (!token) {
      return res.redirect('/login');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.redirect('/login');
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication error (page):', err.message);
    return res.redirect('/login');
  }
};

// Dashboard Page - Protected
app.get('/dashboard', authenticatePage, async (req, res) => {
  try {
    const user = req.user;
    res.render('dashboard', { user });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.redirect('/login');
  }
});

// Login & register pages
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));

// Profile Page - Protected
app.get('/profile', authenticatePage, async (req, res) => {
  try {
    res.render('profile', { user: req.user });
  } catch (error) {
    console.error('Profile page error:', error);
    res.redirect('/login');
  }
});

// Add Review Page
app.get('/add-review', authenticatePage, async (req, res) => {
  try {
    res.render('add-review', { user: req.user });
  } catch (error) {
    console.error('Add review page error:', error);
    res.redirect('/login');
  }
});

// My Reviews Page
app.get('/my-reviews', authenticatePage, async (req, res) => {
  try {
    res.render('my-reviews', { user: req.user });
  } catch (error) {
    console.error('My reviews page error:', error);
    res.redirect('/login');
  }
});

// Browse / Restaurant pages (public)
app.get('/browse', (req, res) => res.render('browse'));

// Single review details
app.get('/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    res.render('review-details', { review });
  } catch (err) {
    console.error('Error loading review details:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// My Review Details & Edit (protected)
app.get('/my-reviews/:id', authenticatePage, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    if (review.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.redirect('/my-reviews');
    }
    res.render('my-review-details', { review, user: req.user });
  } catch (err) {
    console.error('Error loading my review details:', err);
    res.redirect('/my-reviews');
  }
});

app.get('/my-reviews/:id/edit', authenticatePage, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    if (review.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.redirect('/my-reviews');
    }
    res.render('edit-review', { review, user: req.user });
  } catch (err) {
    console.error('Error loading edit review page:', err);
    res.redirect('/my-reviews');
  }
});

// Restaurant page by business name
app.get('/restaurants/:name', async (req, res) => {
  try {
    const businessName = decodeURIComponent(req.params.name);
    const reviews = await Review.find({ business_name: businessName }).sort({ review_date: -1 });

    if (!reviews.length) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const totalReviews = reviews.length;
    const avgRating = (reviews.reduce((sum, r) => sum + r.review_stars, 0) / totalReviews).toFixed(1);
    const restaurant = reviews[0];

    res.render('restaurant', { restaurant, reviews, avgRating, totalReviews });
  } catch (err) {
    console.error('Error loading restaurant page:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// About & Contact
app.get('/about', (req, res) => res.render('about'));
app.get('/contact', (req, res) => res.render('contact'));

/**
 * Manage Accounts page:
 * - accessible to all authenticated users (not public)
 * - if admin: show all users
 * - if non-admin: show only their own account (so they can manage it)
 */
app.get('/manage-accounts', authenticatePage, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // Admin sees list of users (limit to 200 for safety)
      const users = await User.find().select('-password').limit(200);
      return res.render('manage-accounts', { user: req.user, users });
    } else {
      // Non-admin sees only their own account to manage
      return res.render('manage-accounts', { user: req.user, users: [req.user] });
    }
  } catch (err) {
    console.error('Error loading manage accounts page:', err);
    res.redirect('/dashboard');
  }
});

// 404 handler (keep JSON for API style)
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack || err.message || err);
  res.status(500).json({ success: false, message: 'Server Error' });
});

/**
 * Important: do NOT call app.listen when server is being required by serverless runtime.
 * Only listen when running locally (node server.js)
 */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
  });
}

// Export app so serverless (Vercel) can call it
module.exports = app;
