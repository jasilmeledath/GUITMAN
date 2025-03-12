const mongoose = require('mongoose');


// Enhanced Wallet Schema
const walletSchema = new mongoose.Schema({
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  history: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transactions'
  }],
  cards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DebitCard'
  }],
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware to update the updatedAt field
walletSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});


const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;