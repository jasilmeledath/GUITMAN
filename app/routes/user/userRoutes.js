const express = require('express');
const router = express.Router();
const userAuth = require("../../controllers/user/userAuth");
const { validateLoginForm } = require('../../validators/validateLoginForm');
const verifyUser = require("../../middlewares/verifyUser");
const loadPages = require('../../controllers/user/loadPages');
const passport = require("../../config/passport");
const {redirectIfUserLoggedIn} = require("../../middlewares/redirectIfLoggedIn");
const cartRoutes = require('../user/cartRoutes');
const profileRoutes = require('../../routes/user/profileRoutes');
const loadProfilePages = require('../../controllers/user/loadProfilePages')

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
router.get('/reset-password', loadPages.resetPassword);
router.post('/reset-password-send-otp', userAuth.sendOtpToResetPassword);
router.post('/reset-password-verify-otp', userAuth.verifOtpToResetPassword);
router.put('/reset-password', userAuth.resetPassword);
router.get('/contact', loadPages.contact)

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
router.use('/profile', verifyUser, profileRoutes);
router.get('/profile', verifyUser, loadProfilePages.userProfile);
router.use('/cart', verifyUser, cartRoutes);

// Logout route
router.get('/logout', userAuth.logout);

module.exports = router;