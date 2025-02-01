const express = require("express");
const router = express.Router();
const adminControls = require("../../controllers/admin/adminControls");
const adminDash = require("../../controllers/admin/adminDash")
const productRoutes  = require("../admin/productRoutes");

// function test(){
//     console.log("invoked");
// }
// test()

router.get('/user-list', adminDash.loadUserList);
router.get('/user-cards', adminDash.loadUserCards);
router.get('/user-details/:id', adminDash.loadUserDetails);
router.post('/block-user/:id', adminControls.blockUser);
router.post('/unblock-user/:id', adminControls.unblockUser);
router.use('/product', productRoutes);


module.exports = router;
