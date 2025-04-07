const express = require('express');
const router = express.Router();
const loadAdminPage = require('../../controllers/admin/loadAdminpage');
const orderControls = require('../../controllers/admin/orderController');

router.get('/list', loadAdminPage.getOrders);
router.get('/details/:orderId', loadAdminPage.orderDetail);
router.get('/return-requests', loadAdminPage.getReturnReqOrders);
router.patch('/:orderId/status', orderControls.updateOrderStatus);
router.patch('/return-approve/:orderId', orderControls.approveReturnRequest);
router.patch('/return-reject/:orderId', orderControls.rejectReturnRequest);

module.exports = router;