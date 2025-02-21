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
      // If no token is found, you may want to return null or handle the error.
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
    console.error("Error fetching user", err);
    next(err);
  }
}

module.exports = getUser;
