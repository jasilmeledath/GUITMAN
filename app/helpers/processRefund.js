const Wallet = require('../models/walletModel'); // adjust path as needed
const createTransaction = require('./createTransaction'); // adjust path as needed

/**
 * Processes a refund by updating the user's wallet balance,
 * creating a refund transaction record, and updating the wallet's history.
 * @param {Object} params - Refund parameters.
 * @param {mongoose.Schema.Types.ObjectId} params.userId - The user ID.
 * @param {string} params.orderId - The order ID for which refund is processed.
 * @param {number} params.amount - Refund amount.
 * @param {string} params.reason - The reason for refund.
 * @returns {Promise<Object>} The created refund transaction.
 */
const processRefund = async ({ userId, orderId, amount, reason }) => {
  // Find the wallet; if not present, create one.
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = new Wallet({ user: userId });
  }

  // Update wallet balance
  wallet.balance += amount;

  // Create a refund transaction record
  const refundTransaction = await createTransaction({
    user: userId,
    transaction_id: `REFUND_${orderId}_${Date.now()}`, // Unique refund transaction ID
    transaction_type: 'refund',
    amount,
    description: `Refund for cancelled order ${orderId}. Reason: ${reason}`,
    date: new Date()
  });

  // Add the transaction reference to the wallet's history array
  wallet.history.push(refundTransaction._id);

  // Save the updated wallet
  await wallet.save();

  return refundTransaction;
};

module.exports = processRefund;
