const express = require('express');
const router =  express.Router();
const loadProfilePages = require('../../controllers/user/loadProfilePages');
const profileControls = require('../../controllers/user/userProfileControls');
const { upload, resizeImages, } = require('../../config/multer');

router.get('/addresses', loadProfilePages.profileAddresses);
router.get('/wallet')
router.get('/orders', loadProfilePages.profileOrders);
router.get('/bucket-list', loadProfilePages.profileBucketList);
router.get('/settings', loadProfilePages.profileSettings);

router.put('/update-profile-image', upload.single('profile_image'), profileControls.updateProfileImage);


module.exports = router;

