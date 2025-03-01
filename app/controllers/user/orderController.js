const Order = require('../../models/orderModel');
const getCart = require('../../helpers/getCart');
const getUser = require('../../helpers/getUser');
const HttpStatus = require('../../utils/httpStatus');
const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');
var count = 0;

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

            if (paymentMethod === 'cod') {
                // Map cart items to the order items format
                const items = cart.items.map(item => ({
                    product: item.product,
                    quantity: item.quantity,
                    price: item.item_price
                }));

                // Create the order using additional cost breakdown details
                const order = new Order({
                    items: items,
                    payment_method: paymentMethod,
                    subtotal: cart.cart_subtotal,
                    shipping: cart.shipping_fee,
                    tax: cart.tax,
                    discount: cart.savings,
                    total: cart.cart_total,
                    user: user._id,
                    address: addressId
                });
                const newOrder = await order.save();

                if (!newOrder) {
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ success: false, message: "Something went wrong! Please try again later!" });
                }

                // Reduce the stock of each product based on the ordered quantity
                await Promise.all(
                    cart.items.map(item =>
                        Product.findByIdAndUpdate(
                            item.product,
                            { $inc: { stock: -item.quantity } }
                        )
                    )
                );

                // Reset (empty) the cart after placing the order
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
                console.log(count++);
                
                return res.status(HttpStatus.OK)
                    .json({ success: true, message: "Order Placed!", orderId: newOrder.order_id });
            }

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
            
            return res.status(400).json({ error: 'Return reason is required.' });
          }
      
          // Find the order using the order_id field from your Order model.
          const order = await Order.findOne({ order_id: orderId });
          if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
          }
          
          
      
          // Check if the order is eligible for a return.
          // In this example, only orders with order_status 'delivered' can be returned.
          if (order.order_status !== 'delivered') {
            return res.status(400).json({ error: 'Only delivered orders can be returned.' });
          }
          
      
          // Check if a return request has already been submitted.
          if (order.return_details.status !== 'none') {
            return res.status(400).json({ error: 'Return request has already been submitted.' });
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
      
          return res.status(200).json({ message: 'Return request submitted successfully.' });
        } catch (error) {
          next(error);
        }
      }
};

module.exports = orderControls;
