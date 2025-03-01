const mongoose = require('mongoose');

// Debit Card Schema
const debitCardSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
  cardNumber: { 
    type: String, 
    required: true,
    unique: true,
  },
  cardHolder: { 
    type: String, 
    required: true 
  },
  expiry: { 
    type: String, 
    required: true,
  },
  cardType: {
    type: String, 
    required: true,
    enum: ['VISA', 'MASTERCARD'] 
  },

  last4: {
    type: String,
    required: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },

  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});


// Create models
const DebitCard = mongoose.model('DebitCard', debitCardSchema);

module.exports = DebitCard; 