const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Review = require('../models/Review');

// Read your Yelp dataset from JSON file
const datasetPath = path.join(__dirname, '..', 'data', 'dataset_yelp.json');
const yourActualDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

async function importData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await Review.deleteMany({});
    
    // Import your full dataset
    await Review.insertMany(yourActualDataset);
    
    console.log(`${yourActualDataset.length} Yelp reviews imported successfully`);
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importData();