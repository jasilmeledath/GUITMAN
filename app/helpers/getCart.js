const Cart = require("../models/cartModel");
const jwt = require("jsonwebtoken");

const getToken = (req, res, next) => {
  try {
    const token = req.cookies.authToken;
    return token;
  } catch (err) {
    next(err);
  }
};

const getCart = async (req, res, next) => {
  try {
    const token = getToken(req, res, next);
    if (!token) {
      return null;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return null;
    }
    return cart;
  } catch (err) {
    console.error("Error fetching user", err);
    next(err);
  }
};

module.exports = getCart;
