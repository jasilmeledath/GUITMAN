const express = require('express');
const router =  express.Router();
const loadProfilePages = require('../../controllers/user/loadProfilePages');

router.get('/addresses', loadProfilePages.profileAddresses);
router.get('/wallet')
router.get('/orders', loadProfilePages.profileOrders);
router.get('/bucket-list', loadProfilePages.profileBucketList);
router.get('/settings', loadProfilePages.profileSettings);


module.exports = router;

