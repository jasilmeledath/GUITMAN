const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/user/cartController');
const loadPages = require('../../controllers/user/loadPages');
const orderControls = require('../../controllers/user/orderController');


router.post('/add', cartController.addToCart);
router.get('/view-cart', loadPages.loadCart);
router.delete('/remove-item', cartController.removeCartItem);
router.patch('/update-quantity', cartController.updateItemQuantity);
router.get('/checkout', loadPages.loadCheckout);
router.post('/create-order', orderControls.createOrder);
router.get('/order-confirmation/:orderId',loadPages.orderConfirmation);
router.put('/return/:orderId', orderControls.returnOrder);

module.exports = router;