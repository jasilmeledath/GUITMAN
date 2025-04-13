const express = require("express");
const router = express.Router();
const productController = require("../../controllers/admin/productController");
const offerControls = require("../../controllers/admin/offerController");
const categoryControls = require('../../controllers/admin/categoryController')
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
router.post('/add-category', upload.single('image'), categoryControls.addCategory);
router.put('/edit-category/:id', upload.single('image'), categoryControls.editCategory);
router.patch('/list-category/:id', categoryControls.listCategory);
router.patch('/unlist-category/:id', categoryControls.unlistCategory);

// -------------------
// Offer Routes
// -------------------
router.get('/offers', loadAdminPage.loadOffers);
router.post('/add-offer', offerControls.addOffer);
router.post('/edit-offer', offerControls.editOffer);
router.patch('/toggle-offer-status/:id', offerControls.toggleActiveOffer)
router.delete('/delete-offer/:id', offerControls.deleteOffer);

// -------------------
// Coupon Routes
// -------------------
router.get('/coupons', couponControls.loadCouponPage);
router.post('/create-coupon', couponControls.createCoupon);
router.put('/edit/:couponId', couponControls.editCoupon);
router.patch('/toggle-active/:id', couponControls.toggleActive);
router.delete('/delete-coupon/:id', couponControls.deleteCoupon)

module.exports = router;
