const walletSchema = new mongoose.Schema({
    balance: { type: Number, default: 0 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    history: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TransactionDetail' }]
  });
  
  module.exports = mongoose.model('Wallet', walletSchema);