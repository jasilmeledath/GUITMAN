  const mongoose = require('mongoose');

  const productSchema = new mongoose.Schema({
    product_name: { type: String, required: true, unique: true,},
    description: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    images: [{ type: String, required: true }],
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null },
    isActive: { type: Boolean, default: true },
    isTopModel:{ type: Boolean, default:false}
  });

  module.exports = mongoose.model('Product', productSchema);