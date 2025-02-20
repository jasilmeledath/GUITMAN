const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/user/cartController');
const loadPages = require('../../controllers/user/loadPages');

router.post('/add', cartController.addToCart);
router.get('/view-cart', loadPages.loadCart)

module.exports = router;