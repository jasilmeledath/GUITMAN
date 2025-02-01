const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../utils/tokenBlacklist');

const verifyAdmin = (req, res, next) => {
  const token = req.cookies.authToken; 


  if (!token) {
    return res.status(401).redirect('/admin/login');
  }

  try {
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ message: 'Access denied. Token is invalidated.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; 
    next(); 
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(400).json({ message: 'Invalid token.' });
  }
};


module.exports = verifyAdmin;