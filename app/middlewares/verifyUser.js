const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../utils/tokenBlacklist');
const User = require("../models/userModel");
const unless = require('express-unless');

const verifyUser = async (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return next(); // No token, proceed without authentication
  }

  try {
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ message: 'Access denied. Token is invalidated.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(403).json({ message: 'Invalid token payload.' });
    }

    // Attach the user to the request object
    req.user = decoded;
    const userId = decoded.id;
    const isExistingUser = await User.findById(userId);

    if (!isExistingUser) {
      return res.status(404).redirect('/login');
    }

    if (!isExistingUser.isActive) {
      return res.status(401).redirect('/login');
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(400).json({ message: 'Invalid token.' });
  }
};

// Apply unless condition to skip enforcing authentication for specific routes
verifyUser.unless = unless;

module.exports = verifyUser;