const Order = require('../../models/orderModel');
const processRefund = require('../../helpers/processRefund');

const orderControls = {
    updateOrderStatus: async(req, res, next)=>{
        try {
            const { orderId } = req.params;
            const { order_status } = req.body;
        
            if (!order_status) {
              return res.status(400).json({ success: false, message: 'Order status is required' });
            }
        
            const order = await Order.findOneAndUpdate({ order_id: orderId }, { order_status }, { new: true });
            if (!order) {
              return res.status(404).json({ success: false, message: 'Order not found' });
            }
        
            res.status(200).json({ success: true, message: 'Order status updated successfully.', order });
          } catch (error) {
            next(error);
          }
    },
    approveReturnRequest: async (req, res) => {
      try {
        const { orderId } = req.params;
    
        // Find the order using order_id
        const order = await Order.findOne({ order_id: orderId });
        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }
    
        // Check if there is a pending return request
        if (!order.return_details || order.return_details.status !== 'requested') {
          return res.status(400).json({
            success: false,
            message: 'No pending return request found for this order'
          });
        }
    
        // Update the return request status and timestamp
        order.return_details.status = 'approved';
        order.return_details.processed_at = new Date();
    
        // Save the updated order
        await order.save();
        console.log("Order updated:", order);
    
        // Process the refund
        const refundTransaction = await processRefund({
          userId: order.user,
          orderId: order.order_id,
          amount: order.total,
          reason: null
        });
    
        // Optionally verify the refund was successful
        if (!refundTransaction) {
          return res.status(500).json({
            success: false,
            message: 'Refund processing failed'
          });
        }
    
        return res.status(200).json({
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
        return res.status(500).json({
          success: false,
          message: 'Failed to approve return request',
          error: error.message
        });
      }
    },
      rejectReturnRequest: async (req, res) => {
        try {
          const { orderId } = req.params;
          
          const order = await Order.findOne({ order_id: orderId });
          
          if (!order) {
            return res.status(404).json({ 
              success: false, 
              message: 'Order not found' 
            });
          }
          
          // Check if there is a return request
          if (!order.return_details || order.return_details.status !== 'requested') {
            return res.status(400).json({ 
              success: false, 
              message: 'No pending return request found for this order' 
            });
          }
          
          // Update the return status
          order.return_details.status = 'rejected';
          order.return_details.processed_at = new Date();
          
          await order.save();
          
          return res.status(200).json({
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
          return res.status(500).json({
            success: false,
            message: 'Failed to reject return request',
            error: error.message
          });
        }
      }
}
module.exports = orderControls