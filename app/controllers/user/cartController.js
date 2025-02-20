const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');
const User = require('../../models/userModel');
const httpStatus = require('../../utils/httpStatus');
const jwt = require('jsonwebtoken');
const getUser = require('../../helpers/getUser');

const cartController = {
    addToCart: async (req, res, next) => {
        try {
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
                    shipping_fee: 0
                });
            } else {
                // Check if product is already in the cart
                const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);

                if (existingItemIndex > -1) {
                    // If product already exists, update quantity
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
                    .json({ message: "Error removing item, please try again later!" });
            }
            const user = await getUser(req, res, next);
            await Cart.updateOne({ user: user._id }, { $pull: { items: { product: productId } } })
            return res.status(httpStatus.OK).json({ message: "Item removed success fully;" })
        } catch (err) {
            next(err)
        }
    },

    // updateItemQuantity controller in cartController.js
    updateItemQuantity: async (req, res, next) => {
        const { itemId, change } = req.body;
        const quantityMaxLimit = 15;
        const quantityMinLimit = 0;

        try {
            const user = await getUser(req, res, next);

            if (change === 1) {
                // Check if the item is already at the maximum quantity
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
                    return res
                        .status(httpStatus.UNPROCESSABLE_ENTITY)
                        .json({ success: false, message: "Quantity limit exceeded!" });
                }

                const updatedCart = await Cart.findOneAndUpdate(
                    { user: user._id, "items.product": itemId },
                    { $inc: { "items.$.quantity": 1 } },
                    { new: true }
                );

                return res
                    .status(httpStatus.OK)
                    .json({
                        success: true,
                        message: "Quantity incremented",
                        updatedItem: updatedCart.items.find(item => String(item.product) === String(itemId))
                    });
            } else {
                // If the item's quantity is 1, remove it instead of decrementing further
                const cart = await Cart.findOne({
                    user: user._id,
                    items: {
                        $elemMatch: {
                            product: itemId,
                            quantity: quantityMinLimit
                        }
                    }
                });

                if (cart) {
                    await Cart.updateOne(
                        { user: user._id },
                        { $pull: { items: { product: itemId } } }
                    );
                    return res
                        .status(httpStatus.OK)
                        .json({ success: true, message: "Item removed successfully", removed: true });
                }

                const updatedCart = await Cart.findOneAndUpdate(
                    { user: user._id, "items.product": itemId },
                    { $inc: { "items.$.quantity": -1 } },
                    { new: true }
                );

                return res
                    .status(httpStatus.OK)
                    .json({
                        success: true,
                        message: "Quantity decremented",
                        updatedItem: updatedCart.items.find(item => String(item.product) === String(itemId))
                    });
            }
        } catch (err) {
            next(err);
        }
    },

};
var count = 0;
module.exports = cartController;