const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    rating: { type: Number, required: true },
    feedback: { type: String, required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user_name: {type: String, required: true},
    createdAt: {type: Date, default: Date.now},
  });
  
  module.exports = mongoose.model('Review', reviewSchema);