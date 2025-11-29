const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected (Vercel function)"))
  .catch((err) => console.error("MongoDB error:", err));

const authRoutes = require("../src/routes/auth");
const reviewRoutes = require("../src/routes/reviewRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewRoutes);

app.get("/", (req, res) => {
  res.render("home");        
});

app.get("/login", (req, res) => {
  res.render("login");       
});

app.get("/register", (req, res) => {
  res.render("register");    
});
app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});
module.exports = app;
