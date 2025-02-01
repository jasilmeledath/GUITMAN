const orderSchema = new mongoose.Schema({
    order_id: { type: String, required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true }
      }
    ],
    payment_method: { type: String, required: true },
    payment_status: { type: String, required: true },
    order_status: { type: String, required: true },
    total_amount: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
    coupon_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    timestamp: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model('Order', orderSchema);