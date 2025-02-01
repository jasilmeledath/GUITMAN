const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    offer_type: { type: String, required: true },
    offer_percentage: { type: Number },
    offer_price: { type: Number },
    expiry_date: { type: Date, required: true }
  });
  
  module.exports = mongoose.model('Offer', offerSchema);