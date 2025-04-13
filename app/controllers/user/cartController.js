/**
 * Cart Controller Module
 * Manages cart operations including item addition, removal, and quantity updates
 * 
 * @module controllers/cartController
 */

const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');
const User = require('../../models/userModel');
const httpStatus = require('../../utils/httpStatus');
const jwt = require('jsonwebtoken');
const getUser = require('../../helpers/getUser');
const getProduct = require('../../helpers/getProduct');

const cartController = {
  /**
   * Adds a product to the user's cart
   *
   * @param {Object} req - Express request object containing productId and quantity
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
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

      const product = await Product.findById(productId).populate("offer");
      if (!product) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: "Product not found."
        });
      }

      if (product.stock <= 0) {
        return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: "Product is out of stock. Please contact our team."
        });
      }

      // Calculate final price based on offer
      let discounted_price = product.price;
      if (product.offer) {
        if (product.offer.offer_percentage) {
          discounted_price = product.price - (product.price * product.offer.offer_percentage) / 100;
        } else if (product.offer.offer_price) {
          discounted_price = product.offer.offer_price;
        }
      }

      let cart = await Cart.findOne({ user: userId });

      if (!cart) {
        // Create new cart if none exists
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
          cart_total: discounted_price * quantity,
          tax: 0,
          shipping_fee: 0,
          savings: 0
        });
      } else {
        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        const quantityMaxLimit = 15;

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
          return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
            success: false,
            message: "Quantity limit exceeded!"
          });
        }

        if (existingItemIndex > -1) {
          return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Item already added to cart!"
          });
        }

        // Add new item to cart
        cart.items.push({
          product: productId,
          quantity,
          item_price: product.price,
          offer: product.offer ? product.offer._id : null,
          discounted_price
        });

        // Update cart totals
        cart.cart_subtotal = cart.items.reduce((total, item) => total + (item.quantity * item.discounted_price), 0);

        cart.savings = cart.items.reduce((total, item) => {
          return item.discounted_price < item.item_price
            ? total + ((item.item_price - item.discounted_price) * item.quantity)
            : total;
        }, 0);

        cart.cart_total = cart.cart_subtotal + cart.tax + cart.shipping_fee;
      }

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

  /**
   * Removes a product from the user's cart
   *
   * @param {Object} req - Express request object containing productId in query
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  removeCartItem: async (req, res, next) => {
    try {
      const productId = req.query.productId;
      if (!productId) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Error removing item, please try again later!"
        });
      }

      const user = await getUser(req, res, next);
      const cart = await Cart.findOne({ user: user._id });

      if (!cart) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: "Cart not found"
        });
      }

      const itemToRemove = cart.items.find(item => item.product.toString() === productId);
      if (!itemToRemove) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Item not found in cart"
        });
      }

      cart.items = cart.items.filter(item => item.product.toString() !== productId);

      // Recalculate totals
      cart.cart_subtotal = cart.items.reduce((acc, item) => acc + (item.quantity * item.discounted_price), 0);

      cart.savings = cart.items.reduce((acc, item) => {
        return item.discounted_price < item.item_price
          ? acc + ((item.item_price - item.discounted_price) * item.quantity)
          : acc;
      }, 0);

      cart.cart_total = cart.cart_subtotal + cart.tax + cart.shipping_fee;

      await cart.save();

      return res.status(httpStatus.OK).json({
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

  /**
   * Updates the quantity of a product in the user's cart
   *
   * @param {Object} req - Express request object containing itemId and quantity change
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updateItemQuantity: async (req, res, next) => {
    const { itemId, change } = req.body;
    const quantityMaxLimit = 15;

    try {
      const user = await getUser(req, res, next);
      const product = await getProduct(itemId);

      if (!product.stock || product.stock === 0) {
        return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: "Product is out of stock!"
        });
      }

      let updatedCart;

      if (change === 1) {
        const stockLimit = await Cart.findOne({
          user: user._id,
          items: {
            $elemMatch: {
              product: itemId,
              quantity: product.stock
            }
          }
        });

        if (stockLimit) {
          return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
            success: false,
            message: "Stock limit exceeded!"
          });
        }

        const maxLimitCheck = await Cart.findOne({
          user: user._id,
          items: {
            $elemMatch: {
              product: itemId,
              quantity: quantityMaxLimit
            }
          }
        });

        if (maxLimitCheck) {
          return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
            success: false,
            message: "Quantity limit exceeded!"
          });
        }

        updatedCart = await Cart.findOneAndUpdate(
          { user: user._id, "items.product": itemId },
          { $inc: { "items.$.quantity": 1 } },
          { new: true }
        );

      } else {
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

      // Update totals after quantity change
      if (updatedCart) {
        updatedCart.cart_subtotal = updatedCart.items.reduce(
          (acc, item) => acc + item.discounted_price * item.quantity,
          0
        );

        updatedCart.savings = updatedCart.items.reduce((acc, item) => {
          return item.discounted_price < item.item_price
            ? acc + (item.item_price - item.discounted_price) * item.quantity
            : acc;
        }, 0);

        updatedCart.cart_total = updatedCart.cart_subtotal + updatedCart.tax + updatedCart.shipping_fee;

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

module.exports = cartController;
