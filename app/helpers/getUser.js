const User = require('../models/userModel'); 
const jwt = require('jsonwebtoken');

const getToken = (req, res, next) => {
  try {
    const token = req.cookies.authToken;
    return token;
  } catch (err) {
    next(err);
  }
}

const getUser = async (req, res, next) => {
  try {
    const token = getToken(req, res, next);
    if (!token) {
      // No token found; return null to indicate an unauthenticated user.
      return null;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }
    return user;
  } catch (err) {
    // If the token has expired, handle it gracefully.
    if (err.name === "TokenExpiredError") {
      // Clear the expired token cookie (if you're using cookies to store the token).
      res.clearCookie("token"); // Adjust the cookie name if needed.
      console.error("JWT expired:", err);
      // Return null so the caller can proceed as an unauthenticated user.
      return null;
    }
    // For other errors, pass the error to the next middleware.
    console.error("Error fetching user", err);
    next(err);
  }
};



module.exports = getUser;
