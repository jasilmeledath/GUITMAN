const mongoose = require('mongoose');

// Subdocument schema for each wishlist item
const wishlistItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  addedAt: { type: Date, default: Date.now },
  note: { type: String, trim: true },
  priority: { type: Number, default: 0 }
}, { _id: false });

// Enhanced wishlist schema
const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [wishlistItemSchema],
  name: { type: String, trim: true, default: 'My Bucketlist' },
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
