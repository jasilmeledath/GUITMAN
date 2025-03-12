const Transactions = require('../models/transactionDetails'); // Adjust path as needed

/**
 * Creates and saves a transaction record.
 * @param {Object} details - The transaction details.
 * @param {mongoose.Schema.Types.ObjectId} details.user - The user ID associated with the transaction.
 * @param {string} details.transaction_id - Unique transaction identifier.
 * @param {string} details.transaction_type - Type of transaction (e.g., 'payment').
 * @param {number} details.amount - Transaction amount.
 * @param {string} details.description - Description for the transaction.
 * @param {Date} [details.date=new Date()] - Transaction date.
 * @returns {Promise<Object>} The saved transaction.
 */
const createTransaction = async ({ user, transaction_id, transaction_type, amount, description, date = new Date() }) => {
  try {
    const transaction = new Transactions({
      user,
      transaction_id,
      transaction_type,
      amount,
      description,
      date
    });
    
    await transaction.save();
    
    return transaction;
  } catch (error) {
    // Optionally handle error logging here or re-throw to be caught by higher-level middleware.
    throw error;
  }
};

module.exports = createTransaction;
