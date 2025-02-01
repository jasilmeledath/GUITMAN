const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../utils/tokenBlacklist');

const redirectIfLoggedIn = (req, res, next) => {
    
    const token = req.cookies.authToken;
    

    if (!token) {
        return next(); 
    }
    try {
        if (tokenBlacklist.has(token)) {
            return next();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded && (req.path === '/login' || req.path === '/signup' || req.path === '/' || req.path === '/admin/login')) {
            return res.redirect('/home'); 
        }

        return next(); 
    } catch (error) {
        console.error("JWT Verification Error:", error);
        res.clearCookie('authToken');

        return next(); 
    }
};

module.exports = redirectIfLoggedIn;