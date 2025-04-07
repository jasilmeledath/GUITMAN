const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  offer_type: { 
    type: String, 
    required: true,
    enum: ['product', 'category', 'referral', 'other'] 
  },
  offer_percentage: { type: Number },
  expiry_date: { type: Date, required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  referral_code: { type: String },
  isActive: { type: Boolean, default: true},
  referral_bonus: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Offer', OfferSchema);
