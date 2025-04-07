const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    coupon_code: { type: String, required: true, unique: true, trim: true },
    coupon_type: { type: String, required: true, enum: ['percentage', 'fixed'] }, // Defines types of discounts
    min_amount: { type: Number, default: 0 }, // Minimum purchase required
    discount: { type: Number, required: true }, // Discount value
    max_discount: { type: Number }, // Maximum discount cap
    expire_date: { type: Date, required: true }, // Expiry date
    is_active: { type: Boolean, default: true }, // Active status
    usage_limit: { type: Number, default: 1 }, // How many times a coupon can be used
    redemption_count: { type: Number, default: 0 },
    applicable_categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }], 
    user_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    single_use_per_user: { type: Boolean, default: false }, // Ensures a user can use it only once
  },
  { timestamps: true } // Adds createdAt and updatedAt timestamps
);

module.exports = mongoose.model('Coupon', couponSchema);
