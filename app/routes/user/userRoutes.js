const express = require('express');
const router = express.Router();
const userAuth = require("../../controllers/user/userAuth");
const { validateLoginForm } = require('../../validators/validateLoginForm');
const verifyUser = require("../../middlewares/verifyUser");
const loadPages = require('../../controllers/user/loadPages');
const passport = require("../../config/passport");
const {redirectIfUserLoggedIn} = require("../../middlewares/redirectIfLoggedIn");

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

router.use(redirectIfUserLoggedIn);


router.get('/', loadPages.landing);

// Public routes (no authentication required)
router.get('/login', loadPages.login);
router.get('/signup', loadPages.signup);

// Authentication routes
router.post('/signup', userAuth.signup);
router.post('/verify-otp', userAuth.verifyOtp);
router.post('/resend-otp', userAuth.resendOtp);
router.post('/login', validateLoginForm, userAuth.login);

// Routes that require user information but not strict authentication
// router.get('/tune', loadPages.tuner);
router.get('/shop', loadPages.loadShop);
router.get('/product-details/:id', loadPages.loadProductDetails);

// Protected routes (require authentication)
router.get('/home', verifyUser, loadPages.home);
router.get('/profile/:id', verifyUser, loadPages.userProfile);
router.post('/submit-review/:id', verifyUser, userAuth.submitReview);

// Logout route
router.get('/logout', userAuth.logout);

module.exports = router;