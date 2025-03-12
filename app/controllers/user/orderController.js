const Order = require('../../models/orderModel');
const getCart = require('../../helpers/getCart');
const getUser = require('../../helpers/getUser');
const HttpStatus = require('../../utils/httpStatus');
const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');
const { createOrder: createRazorpayOrder, verifyPayment } = require('../../services/razorpayServices');
const Review = require('../../models/reviewModel');
const createTransaction = require('../../helpers/createTransaction');
const Wallet = require('../../models/walletModel');
const processRefund = require('../../helpers/processRefund');
const Coupon = require('../../models/couponModel');

const orderControls = {
  applyCoupon: async (req, res, next) => {    
    try {      
      const { couponCode } = req.body;
      if (!couponCode) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Coupon code is required!" });
      }
      // Fetch the coupon from the database
      const coupon = await Coupon.findOne({ coupon_code: couponCode, is_active: true });
      if (!coupon) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Invalid coupon code!" });
      }
      // Check if the coupon has expired
      if (coupon.expire_date < new Date()) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Coupon has expired!" });
      }
      // Check if the coupon has reached its usage limit
      if (coupon.usage_limit <= coupon.redemption_count) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Coupon usage limit reached!" });
      }
      // Check if coupon is restricted to specific users
      const user = await getUser(req, res, next);
      if (coupon.user_id && coupon.user_id.length > 0 && !coupon.user_id.includes(user._id)) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "You are not eligible to use this coupon!" });
      }
      // Get the current cart
      const cart = await getCart(req, res, next);
      // Check if the cart meets the minimum purchase required for the coupon
      if (cart.cart_subtotal < coupon.min_amount) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: `Minimum purchase of ₹${coupon.min_amount} required to use this coupon!` });
      }
      // Calculate discount amount based on coupon type
      let discountAmount = 0;
      if (coupon.coupon_type === 'percentage') {
        discountAmount = (coupon.discount / 100) * cart.cart_subtotal;
      } else if (coupon.coupon_type === 'fixed') {
        discountAmount = coupon.discount;
      }
      // Apply maximum discount cap if specified
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount;
      }
      // Update the cart: set savings and recalculate the total
      cart.savings = discountAmount;
      cart.cart_total = cart.cart_subtotal + cart.shipping_fee + cart.tax - discountAmount;
      await cart.save();
      return res.status(HttpStatus.OK)
        .json({ 
          success: true, 
          message: "Coupon applied successfully!", 
          coupon: { code: coupon.coupon_code },
          discount: discountAmount,
          total: cart.cart_total,
          updatedCart: cart
        });
    } catch (err) {
      next(err);
    }
  },
  removeCoupon: async (req, res, next) => {
    try {
      const cart = await getCart(req, res, next);
      // Remove coupon discount by resetting savings and recalculate total
      cart.savings = 0;
      cart.cart_total = cart.cart_subtotal + cart.shipping_fee + cart.tax;
      await cart.save();
      return res.status(HttpStatus.OK)
        .json({ 
          success: true, 
          message: "Coupon removed successfully!",
          total: cart.cart_total,
          updatedCart: cart
        });
    } catch (err) {
      next(err);
    }
  },
  createOrder: async (req, res, next) => {
    try {
      const { addressId, paymentMethod, cardDetails, couponCode } = req.body;
      const cart = await getCart(req, res, next);
      const user = await getUser(req, res, next);
  
      if (!addressId || !paymentMethod) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Select the address and payment method!" });
      }
  
      if (paymentMethod === 'cod') {
        // Map cart items to the order items format
        const items = cart.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          price: item.item_price
        }));
  
        // Create the local order record for COD
        const order = new Order({
          items: items,
          payment_method: paymentMethod,
          subtotal: cart.cart_subtotal,
          shipping: cart.shipping_fee,
          tax: cart.tax,
          discount: cart.savings,
          total: cart.cart_total,
          user: user._id,
          address: addressId,
          status: 'placed' // Order confirmed for COD
        });
        const newOrder = await order.save();
  
        if (!newOrder) {
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: "Something went wrong! Please try again later!" });
        }
  
        // Reduce the stock for each product based on the ordered quantity
        await Promise.all(
          cart.items.map(item =>
            Product.findByIdAndUpdate(
              item.product,
              { $inc: { stock: -item.quantity } }
            )
          )
        );
  
        // Empty the cart after placing the order
        await Cart.findOneAndUpdate(
          { _id: cart._id },
          {
            items: [],
            cart_subtotal: 0,
            cart_total: 0,
            tax: 0,
            shipping_fee: 0,
            savings: 0,
          }
        );
  
        return res.status(HttpStatus.OK)
          .json({ success: true, message: "Order Placed!", orderId: newOrder._id });
      }
  
      if (paymentMethod === 'upi') {
        // Create a Razorpay order using the service function.
        // Ensure the amount is provided in rupees (the service handles conversion to paise)
        const razorpayOrder = await createRazorpayOrder({
          amount: Number(cart.cart_total), // converting to number if not already
          currency: 'INR',
          receipt: `receipt#${Date.now()}`
        });
        if (!razorpayOrder) {
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: "Failed to create Razorpay order!" });
        }
  
        // Map cart items to the order items format
        const items = cart.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          price: item.item_price
        }));
  
        // Create a local order record with the Razorpay order id and status 'pending'
        const newOrder = new Order({
          items: items,
          payment_method: paymentMethod,
          subtotal: cart.cart_subtotal,
          shipping: cart.shipping_fee,
          tax: cart.tax,
          discount: cart.savings,
          total: cart.cart_total,
          user: user._id,
          address: addressId,
          razorpay_order_id: razorpayOrder.id, // store the Razorpay order ID
          status: 'pending' // Payment not yet verified
        });
        const savedOrder = await newOrder.save();
        
        if (!savedOrder) {
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: "Failed to save order!" });
        }
  
        // Return the Razorpay order details and local order ID to the client.
        return res.status(HttpStatus.OK)
          .json({
            success: true,
            message: "Razorpay order created",
            order: razorpayOrder,
            localOrderId: savedOrder._id
          });
      }
  
      // Optionally, handle other payment methods here
  
    } catch (err) {
      next(err);
    }
  },
  verifyRazorpayPayment: async (req, res, next) => {
    try {
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        order_id  // local order ID you sent to the client
      } = req.body;
  
      const cart = await getCart(req, res, next);
      const user = await getUser(req, res, next);
  
      // 1) Verify signature using your existing helper
      const isValidSignature = verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      });
  
      if (!isValidSignature) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid payment signature!'
        });
      }
  
      // 2) Find the order in DB
      const order = await Order.findById(order_id);
      if (!order) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Order not found!'
        });
      }
  
      // 3) Update order status to 'paid' and store Razorpay details
      order.status = 'paid';
      order.razorpay_payment_id = razorpay_payment_id;
      await order.save();
  
      // 4) Create a transaction record using the separate function
      const transaction = await createTransaction({
        user: user._id,
        transaction_id: razorpay_payment_id, // Using Razorpay payment ID as transaction ID
        transaction_type: 'payment',
        amount: order.total,  // Assuming order.total contains the payment amount
        description: `Payment for order ${order_id} verified successfully via Razorpay.`,
        date: new Date()
      });
  
      const wallet = await Wallet.findOne({ user: user._id });
      wallet.history.push(transaction._id);
      await wallet.save();
      // 5) Empty the cart after placing the order
      await Cart.findOneAndUpdate(
        { _id: cart._id },
        {
          items: [],
          cart_subtotal: 0,
          cart_total: 0,
          tax: 0,
          shipping_fee: 0,
          savings: 0,
        }
      );
  
      // 6) Return success response
      return res.json({
        success: true,
        message: 'Payment verified successfully!'
      });
  
    } catch (error) {
      next(error);
    }
  },
  returnOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
  
      // Validate input: a return reason is required.
      if (!reason) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Return reason is required.' });
      }
  
      // Find the order using the order_id field from your Order model.
      const order = await Order.findOne({ order_id: orderId });
      if (!order) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Order not found.' });
      }
  
      // Check if the order is eligible for a return.
      // In this example, only orders with order_status 'delivered' can be returned.
      if (order.order_status !== 'delivered') {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Only delivered orders can be returned.' });
      }
  
      // Check if a return request has already been submitted.
      if (order.return_details.status !== 'none') {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Return request has already been submitted.' });
      }
      console.log('invoked');
      // Update the order with return request details.
      order.return_details = {
        status: 'requested',
        reason: reason,
        requested_at: new Date(),
        processed_at: null
      };
  
      // Optionally, you might want to update the order_status or notify other systems.
      // In this example, we leave order_status unchanged.
  
      await order.save();
  
      return res.status(HttpStatus.OK).json({ message: 'Return request submitted successfully.' });
    } catch (error) {
      next(error);
    }
  },
  cancelOrder: async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
  
      if (!reason) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Cancel reason is required.' });
      }
  
      // Find the order by order_id and update its status to 'cancelled'
      const order = await Order.findOneAndUpdate(
        { order_id: orderId },
        { order_status: 'cancelled' },
        { new: true }
      );
      if (!order) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Order not found.' });
      }
  
      // Process the refund:
      // Assuming order.user is the user ID and order.total holds the refund amount.
      if (order.payment_status === 'paid') {
        await processRefund({
          userId: order.user,
          orderId: order.order_id,
          amount: order.total, // Adjust field name if necessary
          reason
        });
        return res.status(HttpStatus.OK)
          .json({ message: "Order cancelled and refund processed successfully" });
      }
      // Return a success response
      res.status(HttpStatus.OK).json({ message: "Order cancelled successfully" });
    } catch (err) {
      next(err);
    }
  },
  submitReview: async (req, res, next) => {
    try {
      const { productId_0, review_0, rating_0, orderId } = req.body;
  
      const user = await getUser(req, res, next);
      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: "User not found" });
      }
      // Create a new review
      const review = new Review({
        rating: rating_0,
        feedback: review_0,
        order: orderId,
        product: productId_0,
        user: user._id, // Ensure this is an ObjectId
        user_name: user.first_name, // Send user name
      });
  
      // Save the review to the database
      await review.save();
  
      // Redirect or send a response
      res.status(HttpStatus.OK).json({ success: true, message: "Review added successfully!" });
    } catch (err) {
      next(err);
    }
  },
};
  
module.exports = orderControls;
