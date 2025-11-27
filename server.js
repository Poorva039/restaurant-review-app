const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Route files
const auth = require('./src/routes/auth');
const reviewRoutes = require('./src/routes/reviewRoutes');
const User = require('./src/models/user');

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

// Basic route
app.get('/', (req, res) => {
  res.render('home');  
});
// Dashboard Page 
app.get('/dashboard', (req, res) => {
  res.render('dashboard');  
});

// Login Page
app.get('/login', (req, res) => {
  res.render('login');
});

// Register Page  
app.get('/register', (req, res) => {
  res.render('register');
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

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Visit: http://localhost:${PORT}`);
  console.log(` API Base: http://localhost:${PORT}/api`);
});
