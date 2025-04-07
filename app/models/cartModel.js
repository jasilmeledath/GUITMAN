const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      item_price: { type: Number, required: true }, // Price at the time of adding to cart
      offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null }, // Applied product offer
      discounted_price: { type: Number, default: 0 } // Final price after applying product offer
    }
  ],
  cart_subtotal: { type: Number, required: true }, // Total price before tax & shipping
  cart_total: { type: Number, required: true }, // Final price after applying tax & shipping
  tax: { type: Number, default: 0 }, // Tax amount on the cart
  shipping_fee: { type: Number, default: 0 }, // Shipping cost
  savings: { type: Number, default: 0},
  couponApplied: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon'},
  status: {
    type: String,
    enum: ['active', 'checked_out', 'expired', 'abandoned'],
    default: 'active'
  }, 
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // Auto-clear abandoned carts in 7 days
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
