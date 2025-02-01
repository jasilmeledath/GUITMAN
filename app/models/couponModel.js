const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    coupon_code: { type: String, required: true },
    coupon_type: { type: String, required: true },
    min_amount: { type: Number },
    discount: { type: Number, required: true },
    max_discount: { type: Number },
    expire_date: { type: Date, required: true },
    user_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  });
  
  module.exports = mongoose.model('Coupon', couponSchema);