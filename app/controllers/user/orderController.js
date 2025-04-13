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
const { sendEmail } = require("../../services/emailService");
const { generateOrderConfirmationEmail } = require('../../utils/emailTemplates');
const PDFDocument = require('pdfkit');
const { ObjectId } = require('mongodb');
const {addUserToCouponUsedList} = require('../../helpers/addUserToCouponUsedList'); 

const orderControls = {
  /**
   * Applies a coupon to the current cart.
   *
   * Validates the coupon code, checks expiration, usage limits, user eligibility, and minimum purchase.
   * Updates the cart with the discount amount and recalculates the total.
   *
   * @param {Object} req - Express request object containing couponCode in the body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  applyCoupon: async (req, res, next) => {    
    try {      
      const { couponCode } = req.body;
      if (!couponCode) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Coupon code is required!" });
      } 
      const user = await getUser(req,res,next);
      const userId = user._id;
      // Fetch coupon details
      const coupon = await Coupon.findOne({ coupon_code: couponCode, is_active: true });
      
      if (!coupon) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Invalid coupon code!" });
      }
      if (coupon.expire_date < new Date()) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Coupon has expired!" });
      }
      if (coupon.usage_limit <= coupon.redemption_count) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Coupon usage limit reached!" });
      }
      // Check if coupon is restricted to specific users.
      if (
        coupon.user_id &&
        coupon.user_id.length > 0 &&
        coupon.user_id.some(usedUser => usedUser.toString() === userId.toString())
      ) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Coupon is already used or restricted!" });
      }      
      
      const cart = await getCart(req, res, next);
      if (cart.cart_subtotal < coupon.min_amount) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: `Minimum purchase of ₹${coupon.min_amount} required to use this coupon!` });
      }
      // Calculate discount based on coupon type
      let discountAmount = 0;
      if (coupon.coupon_type === 'percentage') {
        discountAmount = (coupon.discount / 100) * cart.cart_subtotal;
      } else if (coupon.coupon_type === 'fixed') {
        discountAmount = coupon.discount;
      }
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount;
      }
      // Update cart details and save
      cart.savings = discountAmount;
      cart.couponApplied = coupon._id;
      cart.cart_total = cart.cart_subtotal + cart.shipping_fee + cart.tax - discountAmount;
      await cart.save();
      return res.status(HttpStatus.OK).json({ 
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

  /**
   * Removes the applied coupon from the current cart.
   *
   * Resets discount-related fields and recalculates the cart total.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  removeCoupon: async (req, res, next) => {
    try {
      const cart = await getCart(req, res, next);
      cart.savings = 0;
      cart.cart_total = cart.cart_subtotal + cart.shipping_fee + cart.tax;
      cart.couponApplied = null;
      await cart.save();
      return res.status(HttpStatus.OK).json({ 
        success: true, 
        message: "Coupon removed successfully!",
        total: cart.cart_total,
        updatedCart: cart
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Creates an order based on the current cart and chosen payment method.
   *
   * For COD, it validates the order amount and creates a local order record.
   * For UPI, it initiates a Razorpay order and creates a local order record with 'pending' status.
   *
   * @param {Object} req - Express request object containing addressId, paymentMethod, and optionally couponCode in the body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  createOrder: async (req, res, next) => {
    try {
      const { addressId, paymentMethod, cardDetails, couponCode } = req.body;
      const cart = await getCart(req, res, next);
      const user = await getUser(req, res, next);
      const userId = user._id;
  
      if (!addressId || !paymentMethod) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Select the address and payment method!" });
      }
  
      // Handle COD orders
      if (paymentMethod === 'cod') {
        const items = cart.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          price: item.item_price
        }));
        if (cart.total >= 1001) {
          return res.status(HttpStatus.BAD_REQUEST)
            .json({ success: false, message: "Order amount allowed for COD exceeded!" });
        }
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
          status: 'placed'
        });
        const newOrder = await order.save();
        if (!newOrder) {
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: "Something went wrong! Please try again later!" });
        }
        // Deduct stock for ordered products
        await Promise.all(
          cart.items.map(item =>
            Product.findByIdAndUpdate(
              item.product,
              { $inc: { stock: -item.quantity } }
            )
          )
        );

        // Add user to coupon used list
        const couponId = cart?.couponApplied;
        if(couponId){
        await addUserToCouponUsedList(couponId,userId);
        }

        // Clear the cart after order placement
        await Cart.findOneAndUpdate(
          { _id: cart._id },
          {
            items: [],
            cart_subtotal: 0,
            cart_total: 0,
            tax: 0,
            shipping_fee: 0,
            savings: 0,
            couponApplied: null,
          }
        );
        
        const getExpectedDeliveryDate = () => {
          const today = new Date();
          today.setDate(today.getDate() + 5);
          return today;
        };
        const expectedDeliveryDate = getExpectedDeliveryDate();
        const emailContent = generateOrderConfirmationEmail(
          user.first_name,
          newOrder.order_id,
          newOrder.total,
          expectedDeliveryDate
        );
        await sendEmail(user.email, emailContent.subject, emailContent.text, emailContent.html);
  
        return res.status(HttpStatus.OK).json({ success: true, message: "Order Placed!", orderId: newOrder._id });
      }
  
      // Handle UPI payment orders
      if (paymentMethod === 'upi') {
        const razorpayOrder = await createRazorpayOrder({
          amount: Number(cart.cart_total),
          currency: 'INR',
          receipt: `receipt#${Date.now()}`
        });
        if (!razorpayOrder) {
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: "Failed to create Razorpay order!" });
        }
  
        const items = cart.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          price: item.item_price
        }));
  
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
          razorpay_order_id: razorpayOrder.id,
          status: 'pending'
        });
        const savedOrder = await newOrder.save();
        if (!savedOrder) {
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: "Failed to save order!" });
        }
  
        return res.status(HttpStatus.OK).json({
          success: true,
          message: "Razorpay order created",
          order: razorpayOrder,
          localOrderId: savedOrder._id
        });
      }
      // Optionally handle additional payment methods here
  
    } catch (err) {
      next(err);
    }
  },

  /**
   * Updates an order for retrying payment by generating a new Razorpay order.
   *
   * @param {Object} req - Express request object containing the order_id parameter.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  updateOrderForRetryPayment: async (req, res, next) => {
    try {
      const { order_id } = req.params;
      // Find order by order_id
      const order = await Order.findOne({ order_id });
      if (!order) {
        return res.status(HttpStatus.NOT_FOUND)
          .json({ success: false, message: "Order not found" });
      }
      if (order.payment_method !== 'upi') {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Retry payment is only available for UPI payments." });
      }
      const razorpayOrder = await createRazorpayOrder({
        amount: Number(order.total),
        currency: 'INR',
        receipt: `receipt#retry-${Date.now()}`
      });
      if (!razorpayOrder) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: "Failed to create Razorpay order for retry." });
      }
      order.razorpay_order_id = razorpayOrder.id;
      order.status = 'pending';
      await order.save();
      return res.status(HttpStatus.OK)
        .json({
          success: true,
          message: "Order updated for retry payment.",
          razorpay_order_id: razorpayOrder.id
        });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verifies Razorpay payment details and finalizes the order.
   *
   * Updates order status to 'paid', creates a transaction record, updates wallet history,
   * reduces product stock, clears the cart, and sends a confirmation email.
   *
   * @param {Object} req - Express request object containing Razorpay details and local order ID.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  verifyRazorpayPayment: async (req, res, next) => {
    try {
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        order_id // local order ID
      } = req.body;
  
      const cart = await getCart(req, res, next);
      const user = await getUser(req, res, next);
      const userId = user._id;
  
      // Verify payment signature
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
  
      // Retrieve order from DB
      let order;
      if (ObjectId.isValid(order_id)) {
        order = await Order.findById(order_id);
      } else {
        order = await Order.findOne({ order_id });
      }
      if (!order) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Order not found!'
        });
      }
  
      // Update order status and store Razorpay payment ID
      order.payment_status = 'paid';
      order.razorpay_payment_id = razorpay_payment_id;
      await order.save();
  
      // Log the transaction
      const transaction = await createTransaction({
        user: user._id,
        transaction_id: razorpay_payment_id,
        transaction_type: 'payment',
        amount: order.total,
        description: `Payment for order ${order_id} verified successfully via Razorpay.`,
        date: new Date()
      });
  
      // Update wallet history
      let wallet = await Wallet.findOne({ user: user._id });
      if (!wallet) {
        wallet = new Wallet({ user: user._id, history: [] });
      }
      wallet.history.push(transaction._id);
      await wallet.save();
  
      // Deduct product stock
      if (cart && cart.items && cart.items.length) {
        await Promise.all(
          cart.items.map(item =>
            Product.findByIdAndUpdate(
              item.product,
              { $inc: { stock: -item.quantity } },
              { new: true }
            )
          )
        );
      } 
      
      // Add user to coupon used list
      const couponId = cart?.couponApplied;
      if(couponId){
        await addUserToCouponUsedList(couponId,userId);
      }

      // Clear the cart
      await Cart.findOneAndUpdate(
        { _id: cart._id },
        {
          items: [],
          cart_subtotal: 0,
          cart_total: 0,
          tax: 0,
          shipping_fee: 0,
          savings: 0,
          couponApplied: null,
        }
      );
  
      // Prepare and send order confirmation email
      const getExpectedDeliveryDate = () => {
        const today = new Date();
        today.setDate(today.getDate() + 5);
        return today;
      };
      const expectedDeliveryDate = getExpectedDeliveryDate();
      const emailContent = generateOrderConfirmationEmail(
        user.first_name,
        order.order_id,
        order.total,
        expectedDeliveryDate
      );
      await sendEmail(user.email, emailContent.subject, emailContent.text, emailContent.html);
  
      return res.json({
        success: true,
        message: 'Payment verified successfully!'
      });
  
    } catch (error) {
      next(error);
    }
  },
    
  /**
   * Generates a downloadable invoice PDF for the specified order.
   *
   * Queries the order by order_id, constructs a PDF document with order details, and streams it back.
   *
   * @param {Object} req - Express request object containing orderId in params.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  downloadInvoice: async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findOne({ order_id: orderId })
        .populate('items.product')
        .lean();
  
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      const doc = new PDFDocument({ margin: 50 });
  
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.order_id}.pdf`);
  
      doc.pipe(res);
  
      // Header Section
      doc.font('Helvetica-Bold')
         .fontSize(26)
         .fillColor('#0284c7')
         .text('GuitMan', { align: 'center' })
         .moveDown(0.3);
      doc.font('Helvetica')
         .fontSize(16)
         .fillColor('#333')
         .text('Invoice', { align: 'center' })
         .moveDown();
  
      // Order Information
      const orderDate = new Date(order.timestamp).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      doc.fontSize(12)
         .fillColor('#333')
         .text(`Order ID: ${order.order_id}`, { align: 'left' })
         .text(`Order Date: ${orderDate}`, { align: 'left' })
         .moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#ddd').moveDown();
  
      // Items Table Header
      doc.fontSize(12)
         .fillColor('#333')
         .text('Item', 50, doc.y, { width: 200, continued: true })
         .text('Qty', 260, doc.y, { width: 50, continued: true })
         .text('Price (Rs.)', 320, doc.y, { width: 100, continued: true })
         .text('Total (Rs.)', 430, doc.y, { width: 100 });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#ddd').moveDown();
  
      // List Items
      order.items.forEach(item => {
        const productName = item.product ? item.product.product_name : 'Unknown Item';
        const price = item.price;
        const quantity = item.quantity;
        const total = price * quantity;
  
        doc.fontSize(12)
           .fillColor('#333')
           .text(productName, 50, doc.y, { width: 200, continued: true })
           .text(quantity.toString(), 260, doc.y, { width: 50, continued: true })
           .text(price.toFixed(2), 320, doc.y, { width: 100, continued: true })
           .text(total.toFixed(2), 430, doc.y, { width: 100 });
        doc.moveDown(0.5);
      });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#ddd').moveDown();
  
      // Totals Section
      doc.fontSize(12)
         .fillColor('#333')
         .text(`Subtotal: Rs.${order.subtotal.toFixed(2)}`, { align: 'right' })
         .moveDown(0.3);
      doc.text(`Shipping: Rs.${order.shipping.toFixed(2)}`, { align: 'right' })
         .moveDown(0.3);
      doc.text(`Tax: Rs.${order.tax.toFixed(2)}`, { align: 'right' })
         .moveDown(0.3);
      if (order.discount && order.discount > 0) {
        doc.text(`Discount: -Rs.${order.discount.toFixed(2)}`, { align: 'right' })
           .moveDown(0.3);
      }
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor('#0284c7')
         .text(`Total: Rs.${order.total.toFixed(2)}`, { align: 'right' });
  
      // Footer Section
      doc.moveDown(2);
      doc.fontSize(10)
         .fillColor('#777')
         .text('Thank you for shopping with GuitMan!', { align: 'center' })
         .moveDown(0.5);
      doc.fontSize(10)
         .text('For any queries, please contact support@guitman.com', { align: 'center' });
  
      doc.end();
    } catch (error) {
      next(error);
    }
  },

  /**
   * Submits a return request for a delivered order.
   *
   * Validates the input, checks if the order exists and is eligible for return,
   * then updates the order's return_details.
   *
   * @param {Object} req - Express request object containing orderId in params and reason in body.
   * @param {Object} res - Express response object.
   */
  returnOrder: async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
  
      if (!reason) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Return reason is required.' });
      }
  
      const order = await Order.findOne({ order_id: orderId });
      if (!order) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Order not found.' });
      }
  
      if (order.order_status !== 'delivered') {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Only delivered orders can be returned.' });
      }
  
      if (order.return_details.status !== 'none') {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Return request has already been submitted.' });
      }
  
      order.return_details = {
        status: 'requested',
        reason: reason,
        requested_at: new Date(),
        processed_at: null
      };
  
      await order.save();
  
      return res.status(HttpStatus.OK).json({ message: 'Return request submitted successfully.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Cancels an order and processes a refund if applicable.
   *
   * Validates the cancellation reason, updates order_status to 'cancelled',
   * and calls processRefund for non-COD orders if payment was made.
   *
   * @param {Object} req - Express request object containing orderId in params and reason in body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  cancelOrder: async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
  
      if (!reason) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Cancel reason is required.' });
      }
  
      const order = await Order.findOneAndUpdate(
        { order_id: orderId },
        { order_status: 'cancelled' },
        { new: true }
      );
      if (!order) {
        return res.status(HttpStatus.NOT_FOUND)
          .json({ error: 'Order not found.' });
      }
  
      if (order.payment_status === 'paid' && order.payment_method !== 'cod') {
        await processRefund({
          userId: order.user,
          orderId: order.order_id,
          amount: order.total,
          reason
        });
        return res.status(HttpStatus.OK)
          .json({ message: "Order cancelled and refund processed successfully" });
      }
  
      res.status(HttpStatus.OK).json({ message: "Order cancelled successfully" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Marks an order's payment as failed, resetting its payment status.
   *
   * @param {Object} req - Express request object containing order_id in the body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  handleFailedPayment: async (req, res, next) => {
    try {
      const { order_id } = req.body;
      let order;
      if (!ObjectId.isValid(order_id)) {
        order = await Order.findOne({ order_id });
      } else {
        order = await Order.findById(order_id);
      }
      order.payment_status = 'failed';
      order.order_status = 'pending';
      await order.save();
      res.status(HttpStatus.OK).json({ success: true, order: order });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Submits a product review for an order.
   *
   * Creates a new review record linking the user, product, and order details.
   *
   * @param {Object} req - Express request object containing productId_0, review_0, rating_0, and orderId in the body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  submitReview: async (req, res, next) => {
    try {
      const { productId_0, review_0, rating_0, orderId } = req.body;
      const user = await getUser(req, res, next);
      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: "User not found" });
      }
      const review = new Review({
        rating: rating_0,
        feedback: review_0,
        order: orderId,
        product: productId_0,
        user: user._id,
        user_name: user.first_name,
      });
      await review.save();
      res.status(HttpStatus.OK).json({ success: true, message: "Review added successfully!" });
    } catch (err) {
      next(err);
    }
  },
};
  
module.exports = orderControls;
