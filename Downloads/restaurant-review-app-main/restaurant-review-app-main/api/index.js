// index.js - Express app for Vercel (no change to server.js)

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Load env vars (Vercel also injects them)
dotenv.config();

// ==== 1. Create app ====
const app = express();

// ==== 2. Connect to MongoDB ====
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGODB_URI is not set in .env');
} else {
  mongoose
    .connect(mongoUri, {
      // options optional in newer mongoose, but harmless:
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    })
    .then(() => console.log('✅ MongoDB connected (index.js / Vercel)'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));
}

// ==== 3. Middleware ====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// Static files (adjust if your public folder name is different)
app.use(express.static(path.join(__dirname, 'public')));

// View engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==== 4. Routes (API) ====
// ⚠️ Adjust these require paths if your files live in /src/routes etc.

try {
  const reviewRoutes = require('./reviewRoutes');      // or './src/routes/reviewRoutes'
  app.use('/api/reviews', reviewRoutes);
} catch (e) {
  console.warn('⚠️ Could not load ./reviewRoutes (adjust path in index.js if needed)');
}

try {
  const dashboardRoutes = require('./dashboard');      // or './src/routes/dashboard'
  app.use('/api/dashboard', dashboardRoutes);
} catch (e) {
  console.warn('⚠️ Could not load ./dashboard (adjust path in index.js if needed)');
}

try {
  const authRoutes = require('./auth');                // or './src/routes/auth'
  app.use('/api/auth', authRoutes);
} catch (e) {
  console.warn('⚠️ Could not load ./auth (adjust path in index.js if needed)');
}

try {
  const uploadRoutes = require('./src/routes/upload'); // if you created upload.js there
  app.use('/api/uploads', uploadRoutes);
} catch (e) {
  console.warn('⚠️ Could not load ./src/routes/upload (only needed if you use image upload)');
}

// ==== 5. Page routes (EJS views) ====
// You can copy these from your existing server.js.
// I’m adding the common ones based on your project:

app.get('/', (req, res) => {
  res.render('home'); // views/home.ejs
});

app.get('/login', (req, res) => {
  res.render('login'); // views/login.ejs
});

app.get('/register', (req, res) => {
  res.render('register'); // views/register.ejs
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard'); // views/dashboard.ejs
});

app.get('/browse', (req, res) => {
  res.render('browse'); // views/browse.ejs
});

app.get('/add-review', (req, res) => {
  res.render('add-review'); // views/add-review.ejs
});

app.get('/my-reviews', (req, res) => {
  res.render('my-reviews'); // views/my-reviews.ejs
});

app.get('/profile', (req, res) => {
  res.render('profile'); // views/profile.ejs
});

// restaurant page by name (you already created restaurant.ejs)
app.get('/restaurants/:name', (req, res) => {
  res.render('restaurant'); // JS in restaurant.ejs fetches data or you can server-render if you like
});

// my-review details + edit (shells, fetch API on client)
app.get('/my-reviews/:id', (req, res) => {
  res.render('my-review-details');
});

app.get('/my-reviews/:id/edit', (req, res) => {
  res.render('edit-review');
});

// Optional: 404 fallback
app.use((req, res) => {
  res.status(404).render('404', { message: 'Page not found' });
});

// ==== 6. Export for Vercel ====
// Vercel will use this exported app as the handler.
module.exports = app;
