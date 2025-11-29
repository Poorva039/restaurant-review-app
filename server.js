const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Route files
const auth = require('./src/routes/auth');
const reviewRoutes = require('./src/routes/reviewRoutes');
const User = require('./src/models/user');
const dashboardRoutes = require('./src/routes/dashboard');
const Review = require('./src/models/Review');
const uploadRoutes = require('./src/routes/upload');


const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Set view engine with correct path
app.set('view engine', 'ejs');
app.set('views', './views');

// Create initial admin user
const createInitialAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
      const adminUser = await User.create({
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: 'admin'
      });
      console.log(' Initial admin user created:', adminUser.username);
    } else if (adminExists) {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error(' Error creating admin user:', error.message);
  }
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(' MongoDB Connected Successfully');
    createInitialAdmin();
  })
  .catch(err => {
    console.error(' MongoDB connection error:', err.message);
  });

// Mount routers
app.use('/api/auth', auth);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Basic route
app.get('/', (req, res) => {
  res.render('home');  
});
// Dashboard Page 
// In server.js, update the dashboard route:
app.get('/dashboard', async (req, res) => {
  try {
    // For now, we'll handle authentication on the frontend
    // In a real app, you'd verify the token server-side
    res.render('dashboard');
  } catch (error) {
    console.error('Dashboard error:', error);
    res.redirect('/login');
  }
});

// Upload Route
app.use('/api/uploads', uploadRoutes);

// Login Page
app.get('/login', (req, res) => {
  res.render('login');
});

// Register Page  
app.get('/register', (req, res) => {
  res.render('register');
});

// Add these routes after your existing routes in server.js

// Profile Page
app.get('/profile', (req, res) => {
  res.render('profile');
});

// Add Review Page
app.get('/add-review', (req, res) => {
  res.render('add-review');
});

// My Reviews Page
app.get('/my-reviews', (req, res) => {
  res.render('my-reviews');
});

// Browse Restaurants Page
app.get('/browse', (req, res) => {
  res.render('browse');
});

// Review Details Page
app.get('/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).render('404', { message: 'Review not found' }); // or res.sendStatus(404)
    }

    res.render('review-details', { review });
  } catch (err) {
    console.error('Error loading review details:', err);
    res.status(500).send('Server error');
  }
});

// My Review Details Page
app.get('/my-reviews/:id', (req, res) => {
  res.render('my-review-details');
});

// Edit Review Page
app.get('/my-reviews/:id/edit', (req, res) => {
  res.render('edit-review');
});

// Restaurant Page
app.get('/restaurants/:name', async (req, res) => {
  try {
    const businessName = decodeURIComponent(req.params.name);

    const reviews = await Review.find({ business_name: businessName })
      .sort({ review_date: -1 });

    if (!reviews.length) {
      return res.status(404).render('404', { message: 'Restaurant not found' });
    }

    const totalReviews = reviews.length;
    const avgRating =
      (reviews.reduce((sum, r) => sum + r.review_stars, 0) / totalReviews).toFixed(1);

    // use first review as “restaurant info”
    const restaurant = reviews[0];

    res.render('restaurant', {
      restaurant,
      reviews,
      avgRating,
      totalReviews,
    });
  } catch (err) {
    console.error('Error loading restaurant page:', err);
    res.status(500).send('Server error');
  }
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
  console.error(' Server Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Server Error'
  });
});
const PORT = process.env.PORT || 3000;

// server.js – local only
//const app = require('./api/index'); // reuse the same app
//const PORT = process.env.PORT || 3000;

//app.listen(PORT, () => {
//  console.log(`Server running at http://localhost:${PORT}`);
//});

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Visit: http://localhost:${PORT}`);
  console.log(` API Base: http://localhost:${PORT}/api`);
});