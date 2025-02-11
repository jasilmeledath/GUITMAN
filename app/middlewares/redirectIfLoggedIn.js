const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../utils/tokenBlacklist');
const User= require("../models/userModel");
const Admin = require("../models/adminModel");

const redirectIfUserLoggedIn = async(req, res, next) => {

    const token = req.cookies.authToken;

    if (!token) {
        return next(); 
    }
    try {
        if (tokenBlacklist.has(token)) {
            return next();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        const userId = decoded.id;
        const isUser = await User.findById(userId);

        if (isUser && (req.path === '/login' || req.path === '/signup' || req.path === '/' || req.path.includes('admin'))) {    
            
            return res.redirect('/home'); 
        }

        return next(); 
    } catch (error) {
        console.error("JWT Verification Error:", error);
        res.clearCookie('authToken');

        return next(); 
    }
};
const redirectIfAdminLoggedIn = async(req, res, next) => {
    const token = req.cookies.authToken;

    if (!token) {
        return next(); 
    }
    try {
        if (tokenBlacklist.has(token)) {
            return next();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        const adminId = decoded.id;
        const isAdmin = await Admin.findById(adminId);

        if (isAdmin && !req.path.includes('admin') ) {
            return res.redirect('/admin/dashboard'); 
        }else if(req.path == '/admin/login'){
            return res.redirect('/admin/dashboard');  
        }

        return next(); 
    } catch (error) {
        console.error("JWT Verification Error:", error);
        res.clearCookie('authToken');

        return next(); 
    }
};



module.exports = {redirectIfUserLoggedIn,redirectIfAdminLoggedIn};