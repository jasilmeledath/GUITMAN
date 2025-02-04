const express = require("express");
const router = express.Router();
const productController = require("../../controllers/admin/productController");
const loadAdminPage = require("../../controllers/admin/loadAdminpage");
const { upload, resizeImages } = require('../../config/multer');


router.get('/list-product', loadAdminPage.productList);
router.get('/add-product',loadAdminPage.addProduct);
router.post('/add-product',upload.array('files', 5), resizeImages, productController.addProduct);
router.put('/edit-product/:id', upload.array('images', 5), productController.editProduct);
router.get('/product-details/:id', loadAdminPage.productDetails);

router.get('/categories', loadAdminPage.categories);
router.post('/add-category',upload.single('image'), productController.addCategory);
router.put('/edit-category/:id',upload.single('image'), productController.editCategory);
router.patch('/list-category/:id', productController.listCategory);
router.patch('/unlist-category/:id', productController.unlistCategory);


router.get('/offers', loadAdminPage.loadOffers);
router.post('/add-offer', productController.addOffer);

module.exports = router;