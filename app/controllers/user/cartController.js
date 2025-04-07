const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');
const User = require('../../models/userModel');
const httpStatus = require('../../utils/httpStatus');
const jwt = require('jsonwebtoken');
const getUser = require('../../helpers/getUser');
const getProduct = require('../../helpers/getProduct');
const getCart = require('../../helpers/getCart');

const cartController = {
  addToCart: async (req, res, next) => {
    try {
      const user = await getUser(req, res, next);
      const { productId, quantity } = req.body;
      const token = req.cookies.authToken;
  
      if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).redirect('/login');
      }
  
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decodedToken.id;
  
      if (!userId) {
        return res.status(httpStatus.UNAUTHORIZED).json({
          success: false,
          message: "User not authenticated."
        });
      }
  
      if (!productId || quantity <= 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid product data."
        });
      }
  
      // Check if product exists
      const product = await Product.findById(productId).populate("offer");
      if (!product) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: "Product not found."
        });
      }
      const productStock = product.stock;
      if (productStock <= 0) {
        return res.status(httpStatus.UNPROCESSABLE_ENTITY)
          .json({ success: false, message: "Product is out of stock. Please contact our team." });
      }
  
      // Determine final price with discount if an offer exists
      let discounted_price = product.price;
      if (product.offer) {
        if (product.offer.offer_percentage) {
          discounted_price = product.price - (product.price * product.offer.offer_percentage) / 100;
        } else if (product.offer.offer_price) {
          discounted_price = product.offer.offer_price;
        }
      }
  
      // Check if user already has a cart
      let cart = await Cart.findOne({ user: userId });
  
      if (!cart) {
        // Create new cart if it doesn't exist
        cart = new Cart({
          user: userId,
          items: [{
            product: productId,
            quantity,
            item_price: product.price,
            offer: product.offer ? product.offer._id : null,
            discounted_price
          }],
          cart_subtotal: discounted_price * quantity,
          cart_total: discounted_price * quantity, // Initial total before tax/shipping
          tax: 0,
          shipping_fee: 0,
          savings: 0
        });
      } else {
        // Check if product is already in the cart
        const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        const quantityMaxLimit = 15;
        if (existingItemIndex > -1) {
          // Use a different variable name to avoid shadowing the outer "cart"
          const cartCheck = await Cart.findOne({
            user: user._id,
            items: {
              $elemMatch: {
                product: productId,
                quantity: quantityMaxLimit
              }
            }
          });
          if (cartCheck) {
            return res.status(httpStatus.UNPROCESSABLE_ENTITY)
              .json({ success: false, message: "Quantity limit exceeded!" });
          }
          cart.items[existingItemIndex].quantity += quantity;
        } else {
          // If not, add new item
          cart.items.push({
            product: productId,
            quantity,
            item_price: product.price,
            offer: product.offer ? product.offer._id : null,
            discounted_price
          });
        }
  
        // Recalculate cart_subtotal
        cart.cart_subtotal = cart.items.reduce((total, item) => {
          return total + (item.quantity * item.discounted_price);
        }, 0);
  
        // Recalculate savings (if discounted_price is lower than original price)
        cart.savings = cart.items.reduce((total, item) => {
          if (item.discounted_price < item.item_price) {
            return total + (item.item_price - item.discounted_price) * item.quantity;
          }
          return total;
        }, 0);
  
        // Update cart_total (subtotal + tax + shipping)
        cart.cart_total = cart.cart_subtotal + cart.tax + cart.shipping_fee;
      }
  
      // Save the updated cart
      await cart.save();
  
      return res.status(httpStatus.OK).json({
        success: true,
        message: "Product added successfully!",
        cartCount: cart.items.length
      });
  
    } catch (err) {
      console.error("Error in addToCart:", err);
      next(err);
    }
  },  
  removeCartItem: async (req, res, next) => {
    try {
      const productId = req.query.productId;
      if (!productId) {
        return res.status(httpStatus.BAD_REQUEST)
          .json({ success: false, message: "Error removing item, please try again later!" });
      }
  
      const user = await getUser(req, res, next);
  
      // Find the user's cart
      const cart = await Cart.findOne({ user: user._id });
      if (!cart) {
        return res.status(httpStatus.NOT_FOUND)
          .json({ success: false, message: "Cart not found" });
      }
  
      // Find the item to remove using productId. Convert ObjectId to string for comparison.
      const itemToRemove = cart.items.find(item => item.product.toString() === productId);
      if (!itemToRemove) {
        return res.status(httpStatus.BAD_REQUEST)
          .json({ success: false, message: "Item not found in cart" });
      }
  
      // Remove the item from the cart items array
      cart.items = cart.items.filter(item => item.product.toString() !== productId);
  
      // Recalculate cart_subtotal from remaining items
      let newSubtotal = cart.items.reduce((acc, item) => acc + (item.quantity * item.discounted_price), 0);
      cart.cart_subtotal = newSubtotal;
  
      // Recalculate savings
      let newSavings = cart.items.reduce((acc, item) => {
         if (item.discounted_price < item.item_price) {
             return acc + ((item.item_price - item.discounted_price) * item.quantity);
         }
         return acc;
      }, 0);
      cart.savings = newSavings;
  
      // Update cart_total: cart_subtotal + tax + shipping_fee
      cart.cart_total = cart.cart_subtotal + cart.tax + cart.shipping_fee;
  
      await cart.save();
  
      return res.status(httpStatus.OK)
        .json({ 
          success: true, 
          message: "Item removed successfully",
          updatedCart: {
            cart_subtotal: cart.cart_subtotal,
            savings: cart.savings,
            shipping_fee: cart.shipping_fee,
            tax: cart.tax,
            cart_total: cart.cart_total
          }
        });
    } catch (err) {
      next(err);
    }
  },
  
  updateItemQuantity: async (req, res, next) => {
    const { itemId, change } = req.body;
    const quantityMaxLimit = 15;
    const quantityMinLimit = 0;
  
    try {
      const user = await getUser(req, res, next);
      const product = await getProduct(itemId);
      const productStock = product.stock;
      if(!productStock || productStock===0){
        return res.status(httpStatus.UNPROCESSABLE_ENTITY)
        .json({success:false, message:"Product is out of stock!"})
      }
      let updatedCart;
      if (change === 1) {
        const stockLimit = await Cart.findOne({
          user: user._id,
          items: {
            $elemMatch: {
              product: itemId,
              quantity: productStock
            }
          }
        });
        if (stockLimit) {
          return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({ success: false, message: "Stock limit exceeded!" });
        }
        const cart = await Cart.findOne({
          user: user._id,
          items: {
            $elemMatch: {
              product: itemId,
              quantity: quantityMaxLimit
            }
          }
        });
        if (cart) {
          return res.status(httpStatus.UNPROCESSABLE_ENTITY)
            .json({ success: false, message: "Quantity limit exceeded!" });
        }
  
        updatedCart = await Cart.findOneAndUpdate(
          { user: user._id, "items.product": itemId },
          { $inc: { "items.$.quantity": 1 } },
          { new: true }
        );
  
      } else {
        // Check if the quantity is 1 so we remove the item instead of decrementing
        const cart = await Cart.findOne({
          user: user._id,
          items: {
            $elemMatch: {
              product: itemId,
              quantity: 1
            }
          }
        });
  
        if (cart) {
          await Cart.updateOne(
            { user: user._id },
            { $pull: { items: { product: itemId } } }
          );
          updatedCart = await Cart.findOne({ user: user._id });
        } else {
          updatedCart = await Cart.findOneAndUpdate(
            { user: user._id, "items.product": itemId },
            { $inc: { "items.$.quantity": -1 } },
            { new: true }
          );
        }
      }
  
      // Recalculate cart_subtotal and cart_total based on updated items
      if (updatedCart) {
        const newSubtotal = updatedCart.items.reduce(
          (acc, item) => acc + item.discounted_price * item.quantity,
          0
        );
        updatedCart.cart_subtotal = newSubtotal;
  
        // Recalculate savings
        const newSavings = updatedCart.items.reduce((acc, item) => {
          if (item.discounted_price < item.item_price) {
            return acc + (item.item_price - item.discounted_price) * item.quantity;
          }
          return acc;
        }, 0);
        updatedCart.savings = newSavings;
  
        const newTotal = updatedCart.cart_subtotal + updatedCart.tax + updatedCart.shipping_fee;
        updatedCart.cart_total = newTotal;
        await updatedCart.save();
  
        return res.status(httpStatus.OK).json({
          success: true,
          message: change === 1 ? "Quantity incremented" : "Quantity decremented",
          updatedCart,
          updatedItem: updatedCart.items.find(item => item.product.toString() === itemId)
        });
      }
    } catch (err) {
      next(err);
    }
  },
};

var count = 0;
module.exports = cartController;
