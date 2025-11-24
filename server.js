require("dotenv").config();

const express = require("express");
const path = require("path");
const app = express();

// connect to DB
require("./src/config/db");

app.use(express.json());

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views")); 

// Home route
app.get("/", (req, res) => {
  res.render("index", { title: "Restaurant Review App" });
});

// Sample API route 
const reviewRoutes = require("./src/routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
