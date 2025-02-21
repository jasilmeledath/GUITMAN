const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../utils/tokenBlacklist');
const User = require("../models/userModel");
const httpStatus = require('../utils/httpStatus');

const verifyUser = async (req, res, next) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).redirect('/login');
  }
  
  try {
    // Check if the token has been blacklisted
    if (tokenBlacklist.has(token)) {
      return res.status(401).redirect('/login');
    }

    // Verify the token. If it's expired, jwt.verify will throw an error.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.id) {
      return res.status(403).redirect('/login');
    }
    
    // Attach the decoded token (user data) to the request object
    req.user = decoded;
    const userId = decoded.id;
    const existingUser = await User.findById(userId);
    
    if (!existingUser) {
      return res.status(404).redirect('/login');
    }

    if (!existingUser.isActive) {
      return res.status(401).redirect('/login');
    }

    next();
  } catch (err) {
    // If the token has expired, redirect to login
    if (err.name === 'TokenExpiredError') {
      return res.status(401).redirect('/login');
    }
    return res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = verifyUser;
