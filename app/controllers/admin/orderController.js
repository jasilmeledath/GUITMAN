const httpStatus = require('../../utils/httpStatus');
/**
 * Order Controller Module
 * Contains handlers for order status updates and return request management
 */
const Order = require('../../models/orderModel');
const processRefund = require('../../helpers/processRefund');

const orderControls = {
  /**
   * Updates an order's status
   * 
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.orderId - Unique order identifier
   * @param {Object} req.body - Request body
   * @param {string} req.body.order_status - New status to be applied
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} JSON response with updated order or error
   */
  updateOrderStatus: async(req, res, next) => {
    try {
      const { orderId } = req.params;
      const { order_status } = req.body;

      const currentOrderStatusDoc = await Order.findOne(
        { order_id: orderId },
        { order_status: 1, _id: 0 }
      ).lean();
      const currentOrderStatus = currentOrderStatusDoc ? currentOrderStatusDoc.order_status : null;

      if(currentOrderStatus === 'delivered'){
        return res.status(httpStatus.BAD_REQUEST)
        .json({success: false, message: "Order status should not be reversed!"})
      }
      
      if (!order_status) {
        return res.status(httpStatus.BAD_REQUEST)
        .json({ success: false, message: 'Order status is required' });
      }
      
      const order = await Order.findOneAndUpdate({ order_id: orderId }, { order_status }, { new: true });
      if (!order) {
        return res.status(httpStatus.NOT_FOUND)
        .json({ success: false, message: 'Order not found' });
      }
      
      res.status(httpStatus.OK)
      .json({ success: true, message: 'Order status updated successfully.', order });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Approves a customer's return request and initiates refund process
   * 
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.orderId - Unique order identifier
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with return approval details or error
   */
  approveReturnRequest: async (req, res) => {
    try {
      const { orderId } = req.params;

      const order = await Order.findOne({ order_id: orderId });
      if (!order) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: 'Order not found'
        });
      }
  
      if (!order.return_details || order.return_details.status !== 'requested') {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No pending return request found for this order'
        });
      }

      order.return_details.status = 'approved';
      order.return_details.processed_at = new Date();

      await order.save();
      console.log("Order updated:", order);
  
      // Process the financial refund
      const refundTransaction = await processRefund({
        userId: order.user,
        orderId: order.order_id,
        amount: order.total,
        reason: null
      });
  
      // Handle refund processing failure
      if (!refundTransaction) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Refund processing failed'
        });
      }
  
      return res.status(httpStatus.OK).json({
        success: true,
        message: 'Return request approved successfully',
        data: {
          orderId: order.order_id,
          returnStatus: order.return_details.status,
          processedAt: order.return_details.processed_at,
          refundTransactionId: refundTransaction._id
        }
      });
    } catch (error) {
      console.error('Error approving return request:', error);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to approve return request',
        error: error.message
      });
    }
  },

  /**
   * Rejects a customer's return request
   * 
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters 
   * @param {string} req.params.orderId - Unique order identifier
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with return rejection details or error
   */
  rejectReturnRequest: async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const order = await Order.findOne({ order_id: orderId });
      
      if (!order) {
        return res.status(httpStatus.NOT_FOUND).json({ 
          success: false, 
          message: 'Order not found' 
        });
      }
      
      // Validate return request exists and is in appropriate state
      if (!order.return_details || order.return_details.status !== 'requested') {
        return res.status(httpStatus.BAD_REQUEST).json({ 
          success: false, 
          message: 'No pending return request found for this order' 
        });
      }
      
      // Update the return status and processing timestamp
      order.return_details.status = 'rejected';
      order.return_details.processed_at = new Date();
      
      await order.save();
      
      return res.status(httpStatus.OK).json({
        success: true,
        message: 'Return request rejected successfully',
        data: {
          orderId: order.order_id,
          returnStatus: order.return_details.status,
          processedAt: order.return_details.processed_at
        }
      });
    } catch (error) {
      console.error('Error rejecting return request:', error);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to reject return request',
        error: error.message
      });
    }
  },
}

module.exports = orderControls;