const Order = require('../../models/orderModel');
const getCart = require('../../helpers/getCart');
const getUser = require('../../helpers/getUser');
const HttpStatus = require('../../utils/httpStatus');
const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');
const { createOrder, verifyPayment } = require('../../services/razorpayService');

const orderControls = {
  createOrder: async (req, res, next) => {
    try {
      const { addressId, paymentMethod, cardDetails, couponCode } = req.body;
      const cart = await getCart(req, res, next);
      const user = await getUser(req, res, next);

      if (!addressId || !paymentMethod) {
        return res.status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Select the address and payment method!" });
      }
      
      console.log(paymentMethod);

      if (paymentMethod === 'cod') {
        // Map cart items to the order items format
        const items = cart.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          price: item.item_price
        }));

        // Create the local order record
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
          .json({ success: true, message: "Order Placed!", orderId: newOrder.order_id });
      }
      
      if (paymentMethod === 'upi') {
        // Create a Razorpay order using the service function.
        // Ensure the amount is provided in rupees (the service should handle conversion to paise if needed).
        const razorpayOrder = await createOrder({
          amount: cart.cart_total, // amount in rupees; conversion to paise is done inside createOrder if implemented so
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
        // The client will use these details to open the Razorpay checkout.
        console.log('ok');
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
      // For example, you can leave the order_status as 'delivered' or change it to a custom value.
      // In this example, we leave order_status unchanged.

      await order.save();

      return res.status(HttpStatus.OK).json({ message: 'Return request submitted successfully.' });
    } catch (error) {
      next(error);
    }
  },
  cancelOrder: async(req,res,next)=>{
    try {
      const {orderId} = req.params;
      const {reason} = req.body;

      if (!reason) {

        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Cancel reason is required.' });
      }

      // Find the order using the order_id field from your Order model.
      const order = await Order.findOneAndUpdate({ order_id: orderId }, {order_status:'cancelled'});
      if (!order) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Order not found.' });
      }
      res.status(HttpStatus.OK).json({message: "Order cancelled successfully"});
    } catch (err) {
      next(err);
    }
  },
  cancelOrders: async(req,res,next)=>{
    try {
      const {orderId} = req.params;
      const {reason}  =req.body;

      if(!reason) {
        return res.status(HttpStatus.BAD_REQUEST).json({error:"Cancel reason is required!"})
      }
      const order = Order.findOneAndUpdate({order_id:orderId},{order_status:'cancelled'});
      if(!order){
        return res.status(HttpStatus.NOT_FOUND).json({error:"Order not found!"})
      }
      res.status(HttpStatus.OK).json({message:"Order cancelled successfully"})
    } catch (err) {
      next(err)
    }
  },
  submitReview: async (req, res) => {
    try {
      const rating = req.params.id;
      const { productId, feedback } = req.body;

      const user = req.user;
      const userId = user.id; // Ensure this is a string (ObjectId)

      // Fetch user details correctly
      const userDetails = await User.findById(userId);

      if (!userDetails) {
        return res.status(404).send("User not found");
      }

      // Create a new review
      const review = new Review({
        rating,
        feedback,
        product: productId,
        user: userId, // Ensure this is an ObjectId
        user_name: userDetails.first_name, // Send user name
      });

      // Save the review to the database
      await review.save();

      // Redirect or send a response
      res.redirect("/product-details/" + productId);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = orderControls;
