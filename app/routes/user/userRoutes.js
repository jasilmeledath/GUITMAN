const express = require('express');
const router = express.Router();
const userControls = require("../../controllers/user/userAuth");
const { validateLoginForm } = require('../../validators/validateLoginForm');
const verifyUser = require("../../middlewares/verifyUser");
const loadPages = require('../../controllers/user/loadPages');
const passport = require("../../config/passport");
const redirectIfLoggedIn = require("../../middlewares/redirectIfLoggedIn");

// Google OAuth routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false
}), (req, res) => {
    const token = req.user.token;
    res.cookie('authToken', token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    res.redirect('/home');
});

// Logout route
router.get('/logout', (req, res) => {
    res.clearCookie('authToken');
    res.redirect('/');
});

// Public routes (no authentication required)
router.get('/login', loadPages.login);
router.get('/signup', loadPages.signup);

// Authentication routes
router.post('/signup', userControls.signup);
router.post('/verify-otp', userControls.verifyOtp);
router.post('/resend-otp', userControls.resendOtp);
router.post('/login', validateLoginForm, userControls.login);

// Routes that require user information but not strict authentication
router.get('/shop', verifyUser, loadPages.loadShop);
router.get('/product-details/:id', verifyUser, loadPages.loadProductDetails);

// Protected routes (require authentication)
router.get('/home', verifyUser, loadPages.home);
router.get('/profile/:id', verifyUser, loadPages.userProfile);
router.post('/submit-review/:id', verifyUser, userControls.submitReview);

module.exports = router;