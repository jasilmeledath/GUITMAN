const express = require("express");
const router = express.Router();
const adminControls = require("../../controllers/admin/adminControls");
const productRoutes  = require("../admin/productRoutes");
const loadAdminPage  =require("../../controllers/admin/loadAdminpage");

// function test(){
//     console.log("invoked");
// }
// test()

router.get('/user-list', loadAdminPage.userList);
router.get('/user-cards', loadAdminPage.userCards);
router.get('/user-details/:id', loadAdminPage.userDetails);
router.patch('/:action-user/:id', adminControls.toggleUserStatus);
router.use('/product', productRoutes);


module.exports = router;
