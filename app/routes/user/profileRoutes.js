const express = require('express');
const router =  express.Router();
const loadProfilePages = require('../../controllers/user/loadProfilePages');
const profileControls = require('../../controllers/user/userProfileControls');
const { upload, resizeImages, } = require('../../config/multer');
const { profile } = require('console');

router.get('/addresses', loadProfilePages.profileAddresses);
router.get('/wallet')
router.get('/orders', loadProfilePages.profileOrders);
router.get('/bucket-list', loadProfilePages.profileBucketList);
router.get('/settings', loadProfilePages.profileSettings);
router.get('/update-email', loadProfilePages.changeEmail)
router.get('/change-password', loadProfilePages.changePassword);
router.put('/update-profile-image', upload.single('profile_image'), profileControls.updateProfileImage);
router.put('/update-personal-info',profileControls.updateUserInfo);
router.patch('/update-password', profileControls.updatePassword);
router.put('/update-email-send-otp', profileControls.sendOtp);
router.put('/update-email-resend-otp', profileControls.resendOtp);
router.patch('/verify-and-update-email', profileControls.verifyAndUpdateEmail);


module.exports = router;

  