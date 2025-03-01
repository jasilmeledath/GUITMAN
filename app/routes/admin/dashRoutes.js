const express = require("express");
const router = express.Router();
const adminControls = require("../../controllers/admin/adminControls");
const productRoutes  = require("../admin/productRoutes");
const loadAdminPage  =require("../../controllers/admin/loadAdminpage");
const orderRoutes = require("../../routes/admin/orderRoutes");

router.get('/user-list', loadAdminPage.userList);
router.get('/user-cards', loadAdminPage.userCards);
router.get('/user-details/:id', loadAdminPage.userDetails);
router.patch('/:action-user/:id', adminControls.toggleUserStatus);
router.use('/product', productRoutes);
router.use('/orders', orderRoutes);


module.exports = router;
