const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  review_id: {
    type: String,
    required: true,
    unique: true
  },
  business_id: String,
  business_name: {
    type: String,
    required: true,
    trim: true
  },
  user_id: String,
  user_name: {
    type: String,
    required: true
  },
  review_stars: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review_date: {
    type: Date,
    required: true
  },
  review_text: {
    type: String,
    required: true
  },
  user_average_stars: Number,
  is_open: {
    type: Boolean,
    default: false
  },
  categories: [String], // Array field
  business_attributes: { // Nested object
    BusinessParking: String,
    GoodForMeal: String,
    Smoking: String,
    WiFi: String,
    RestaurantsTakeOut: String,
    DogsAllowed: String,
    RestaurantsGoodForGroups: String,
    WheelchairAccessible: String,
    HasTV: String,
    RestaurantsDelivery: String,
    BikeParking: String,
    RestaurantsTableService: String,
    CoatCheck: String,
    Caters: String,
    OutdoorSeating: String,
    BusinessAcceptsCreditCards: String,
    Alcohol: String,
    Music: String,
    Ambience: String,
    RestaurantsAttire: String,
    BusinessAcceptsBitcoin: String,
    HappyHour: String,
    GoodForKids: String,
    RestaurantsReservations: String,
    GoodForDancing: String,
    RestaurantsPriceRange2: String
  },
  location: { 
    address: String,
    city: String,
    state: String,
    postal_code: String,
    latitude: Number,
    longitude: Number
  },
  image_url: String, 
  photos: [{ 
    photo_id: String,
    caption: String,
    label: String,
    photo_url: String
  }],
  useful: Number,
  funny: Number,
  cool: Number,
  source_doc_url: String
}, {
  timestamps: true,
  collection: 'reviews'
});

module.exports = mongoose.model('Review', reviewSchema);