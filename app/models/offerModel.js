const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
    offer_type: { type: String, required: true },
    offer_percentage: { type: Number },
    offer_price: { type: Number },
    expiry_date: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Offer', OfferSchema);