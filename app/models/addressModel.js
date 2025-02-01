const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    contact_number: { type: String, required: true },
    alternate_number: { type: String },
    country: { type: String, required: true },
    state: { type: String, required: true },
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String },
    address_type: { type: String, enum: ['Home', 'Office'], required: true }
  });
  
  module.exports = mongoose.model('Address', addressSchema);