const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    coupon_code: { type: String, required: true, trim: true },
    coupon_type: { type: String, required: true, enum: ['percentage', 'fixed'] }, 
    min_amount: { type: Number, default: 0 }, 
    discount: { type: Number, required: true }, 
    max_discount: { type: Number }, 
    expire_date: { type: Date, required: true }, 
    is_active: { type: Boolean, default: true }, 
    usage_limit: { type: Number, default: 1 }, 
    redemption_count: { type: Number, default: 0 },
    applicable_categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }], 
    user_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],//already used users  
    single_use_per_user: { type: Boolean, default: false }, 
  },
  { timestamps: true } 
);

module.exports = mongoose.model('Coupon', couponSchema);
