const Wishlist = require("../models/wishlistModel");
const jwt = require("jsonwebtoken");

const getToken = (req, res, next) => {
  try {
    const token = req.cookies.authToken;
    return token;
  } catch (err) {
    next(err);
  }
};

const getWishlist = async (req, res, next) => {
  try {
    const token = getToken(req, res, next);
    if (!token) {
      return null;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // If token is expired, clear the cookie and return null
      if (err.name === "TokenExpiredError") {
        res.clearCookie("authToken");
        return null;
      }
      // Forward any other errors
      return next(err);
    }

    const userId = decoded.id;
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return null;
    }
    return wishlist;
  } catch (err) {
    console.error("Error fetching wishlist", err);
    next(err);
  }
};

module.exports = getWishlist;
