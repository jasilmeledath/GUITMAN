const mongoose = require('mongoose');

// Subdocument schema for each wishlist item (saved items)
const wishlistItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  addedAt: { type: Date, default: Date.now },
  note: { type: String, trim: true },
  priority: { type: Number, default: 0 }
}, { _id: false });

// Subdocument schema for a recently viewed product
const recentlyViewedSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  viewedAt: { type: Date, default: Date.now }
}, { _id: false });

// Enhanced wishlist schema including recently viewed products
const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [wishlistItemSchema],
  recentlyViewed: [recentlyViewedSchema],
  name: { type: String, trim: true, default: 'My Bucketlist' },
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
