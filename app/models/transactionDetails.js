const mongoose = require('mongoose');

const transactionsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  transaction_id: { type: String, required: true, unique: true },
  transaction_type: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true }
}, {
  timestamps: true 
});

// Export existing model if available to avoid OverwriteModelError.
module.exports = mongoose.models.Transactions || mongoose.model('Transactions', transactionsSchema);
