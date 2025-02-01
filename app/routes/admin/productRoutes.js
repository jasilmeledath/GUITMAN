const express = require("express");
const router = express.Router();
const productController = require("../../controllers/admin/productController");
const { upload, resizeImages } = require('../../config/multer')

router.get('/list-product', productController.loadProductList);
router.get('/add-product',productController.loadAddProduct);
router.post('/add-product',upload.array('images', 5), resizeImages, productController.addProduct);
router.put('/edit-product/:id', upload.array('images', 5), productController.editProduct);
router.get('/product-details/:id', productController.loadProductDetails);

router.get('/categories', productController.loadCategories);
router.post('/add-category',upload.single('image'), productController.addCategory);
router.put('/edit-category/:id',upload.single('image'), productController.editCategory);
router.patch('/list-category/:id', productController.listCategory);
router.patch('/unlist-category/:id', productController.unlistCategory);


router.get('/offers', productController.loadOffers);
router.post('/add-offer', productController.addOffer);


module.exports = router;