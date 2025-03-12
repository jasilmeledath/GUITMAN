const express = require("express");
const router = express.Router();
const productController = require("../../controllers/admin/productController");
const loadAdminPage = require("../../controllers/admin/loadAdminpage");
const { upload, resizeImages } = require('../../config/multer');
const validateAddProduct = require("../../validators/validateAddProduct");
const validateAddCategory = require('../../validators/validateAddCategory');
const couponControls = require('../../controllers/admin/couponController');

// -------------------
// Product Routes
// -------------------
router.get('/list-product', loadAdminPage.productList);
router.get('/add-product', loadAdminPage.addProduct);
router.post('/add-product', upload.array('files', 5), resizeImages, validateAddProduct, productController.addProduct);
router.patch('/product-toggle-active/:id', productController.productToggle);
router.get('/edit-product/:id', loadAdminPage.editProduct);
router.put('/update-product/:id', upload.any(), resizeImages, productController.updateProduct);
router.get('/product-details/:id', loadAdminPage.productDetails);

// -------------------
// Category Routes
// -------------------
router.get('/categories', loadAdminPage.categories);
router.post('/add-category', upload.single('image'), productController.addCategory);
router.put('/edit-category/:id', upload.single('image'), productController.editCategory);
router.patch('/list-category/:id', productController.listCategory);
router.patch('/unlist-category/:id', productController.unlistCategory);

// -------------------
// Offer Routes
// -------------------
router.get('/offers', loadAdminPage.loadOffers);
router.post('/add-offer', productController.addOffer);
router.patch('/toggle-offer-status/:id', productController.toggleActiveOffer)
router.delete('/delete-offer/:id', productController.deleteOffer);

// -------------------
// Coupon Routes
// -------------------
router.get('/coupons', couponControls.loadCouponPage);
router.post('/create-coupon', couponControls.createCoupon);
router.patch('/toggle-active/:id', couponControls.toggleActive);
router.delete('/delete-coupon/:id', couponControls.deleteCoupon)

module.exports = router;
