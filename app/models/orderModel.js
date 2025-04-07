const mongoose = require('mongoose');

const generateOrderId = () => {
  const prefix = 'GUITMAN';
  const timestamp = Date.now().toString(36).toUpperCase(); // Convert current timestamp to base36 for compact representation
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${timestamp}-${randomPart}`;
};

const orderSchema = new mongoose.Schema({
  order_id: { type: String, required: true, default: generateOrderId },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  payment_method: { type: String, required: true },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'Cash on delivery'],
    default: function () {
      return this.payment_method === 'cod' ? 'Cash on delivery' : 'pending';
    }
  },
  order_status: {
    type: String,
    enum: ['pending', 'placed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  razorpay_order_id: { type: String }, // Field added to store Razorpay order ID for UPI payments
  subtotal: { type: Number, required: true },
  shipping: { type: Number, required: true },
  tax: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
  coupon_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  return_details: {
    status: {
      type: String,
      enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
      default: 'none'
    },
    reason: { type: String },
    requested_at: { type: Date },
    processed_at: { type: Date }
  },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
