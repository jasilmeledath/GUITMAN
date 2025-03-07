const Razorpay = require('razorpay');
const crypto = require('crypto');

// Verify that environment variables are set
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay environment variables (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not set.");
}

// Instantiate Razorpay instance using environment variables
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Creates an order on Razorpay
 * @param {Object} params - Order parameters
 * @param {number} params.amount - Amount in rupees
 * @param {string} [params.currency='INR'] - Currency code
 * @param {string} params.receipt - Receipt identifier
 * @param {number|string} [params.payment_capture=1] - Auto-capture flag
 * @returns {Promise<Object>} - The order object from Razorpay
 */
async function createOrder({ amount, currency = 'INR', receipt, payment_capture = 1 }) {
  try {
    // Ensure amount is a number and convert rupees to paise
    const rupees = Number(amount);
    if (isNaN(rupees)) {
      throw new Error("Invalid amount provided for order creation.");
    }
    const orderOptions = {
      amount: rupees * 100, // conversion from rupees to paise
      currency,
      receipt,
      payment_capture,
    };
    const order = await razorpayInstance.orders.create(orderOptions);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
}

/**
 * Verifies the payment signature
 * @param {Object} paymentDetails - Payment details received from the client
 * @param {string} paymentDetails.razorpay_order_id
 * @param {string} paymentDetails.razorpay_payment_id
 * @param {string} paymentDetails.razorpay_signature
 * @returns {boolean} - True if signature is valid, false otherwise
 */
function verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  return generatedSignature === razorpay_signature;
}

module.exports = {
  createOrder,
  verifyPayment,
};
