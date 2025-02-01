const transactionDetailSchema = new mongoose.Schema({
    transaction_id: { type: String, required: true },
    transaction_type: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true }
  });
  
  module.exports = mongoose.model('TransactionDetail', transactionDetailSchema);