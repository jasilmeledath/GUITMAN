const Order = require('../../models/orderModel');
const pdf = require('html-pdf');
const ExcelJS = require('exceljs');
const httpStatus = require('../../utils/httpStatus');

const salesControls = {
  getSalesReport: async (req, res, next) => {
    try {
      let { startDate, endDate, reportType, page, limit } = req.query;
      page = parseInt(page) || 1;
      limit = parseInt(limit) || 10;
      let filter = {};
  
      // Set date range filter based on the 'timestamp' field
      const today = new Date();
      if (reportType) {
        if (reportType === 'daily') {
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
        } else if (reportType === 'weekly') {
          startDate = new Date();
          startDate.setDate(today.getDate() - 7);
          endDate = new Date();
        } else if (reportType === 'yearly') {
          startDate = new Date(today.getFullYear(), 0, 1);
          endDate = new Date(today.getFullYear(), 11, 31);
        } else if (reportType === 'custom') {
          startDate = new Date(req.query.startDate);
          endDate = new Date(req.query.endDate);
        }
      } else if (startDate && endDate) {
        startDate = new Date(startDate);
        endDate = new Date(endDate);
      }
      if (startDate && endDate) {
        filter.timestamp = { $gte: startDate, $lte: endDate };
      }
  
      // Exclude cancelled orders and orders that have been returned.
      filter.order_status = { $nin: ['cancelled'] };
      filter["return_details.status"] = "none";
  
      const orders = await Order.find(filter)
        .populate('user')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ timestamp: -1 });
      const totalOrdersCount = await Order.countDocuments(filter);
  
      const totals = await Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$total' },
            overallDiscount: { $sum: '$discount' },
            totalNormalDiscount: {
              $sum: { $cond: [{ $eq: ['$coupon_id', null] }, '$discount', 0] }
            },
            totalCouponDeduction: {
              $sum: { $cond: [{ $ne: ['$coupon_id', null] }, '$discount', 0] }
            },
            count: { $sum: 1 }
          }
        }
      ]);
      const summary = totals[0] || {
        totalSales: 0,
        overallDiscount: 0,
        totalNormalDiscount: 0,
        totalCouponDeduction: 0,
        count: 0
      };
  
      res.json({
        orders,
        summary,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalOrdersCount / limit),
          totalOrders: totalOrdersCount
        }
      });
    } catch (err) {
      next(err);
    }
  },
  
  exportSalesReportPDF: async (req, res, next) => {
    try {
      let { startDate, endDate, reportType } = req.query;
      let filter = {};
      const today = new Date();
  
      if (reportType) {
        if (reportType === 'daily') {
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
        } else if (reportType === 'weekly') {
          startDate = new Date();
          startDate.setDate(today.getDate() - 7);
          endDate = new Date();
        } else if (reportType === 'yearly') {
          startDate = new Date(today.getFullYear(), 0, 1);
          endDate = new Date(today.getFullYear(), 11, 31);
        } else if (reportType === 'custom') {
          if (req.query.startDate && req.query.endDate) {
            startDate = new Date(req.query.startDate);
            endDate = new Date(req.query.endDate);
          } else {
            return res
              .status(httpStatus.BAD_REQUEST)
              .json({ error: "Please provide startDate and endDate for custom report" });
          }
        } else {
          if (startDate && endDate) {
            startDate = new Date(startDate);
            endDate = new Date(endDate);
          } else {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
          }
        }
      } else if (startDate && endDate) {
        startDate = new Date(startDate);
        endDate = new Date(endDate);
      } else {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
      }
  
      if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      }
      if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
      }
  
      if (startDate && endDate) {
        filter.timestamp = { $gte: startDate, $lte: endDate };
      }
  
      const orders = await Order.find(filter)
        .populate('user', 'name email')
        .sort({ timestamp: -1 });
  
      const totals = await Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$total' },
            overallDiscount: { $sum: '$discount' },
            count: { $sum: 1 }
          }
        }
      ]);
      const summary = totals[0] || { totalSales: 0, overallDiscount: 0, count: 0 };
  
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>GUITMAN Sales Report</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
              color: #333;
              font-size: 12px;
            }
            .container {
              max-width: 1000px;
              margin: 0 auto;
              background: #fff;
              padding: 20px;
              overflow-x: auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
              color: #007BFF;
            }
            .header p {
              font-size: 14px;
              margin: 5px 0 0;
            }
            .summary {
              margin: 20px 0;
              font-size: 14px;
            }
            .table-container {
              width: 100%;
              overflow-x: auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 10px;
            }
            table, th, td {
              border: 1px solid #ddd;
            }
            th, td {
              padding: 8px;
              text-align: left;
              word-wrap: break-word;
            }
            th {
              background-color: #007BFF;
              color: #fff;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>GUITMAN Sales Report</h1>
              <p>Report Period: ${startDate.toDateString()} - ${endDate.toDateString()}</p>
            </div>
            <div class="summary">
              <p><strong>Overall Order Count:</strong> ${summary.count}</p>
              <p><strong>Overall Order Amount:</strong> ₹${summary.totalSales.toFixed(2)}</p>
              <p><strong>Overall Discount:</strong> ₹${summary.overallDiscount.toFixed(2)}</p>
            </div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Billing Email</th>
                    <th>Payment Method</th>
                    <th>Date</th>
                    <th>Total Amount</th>
                    <th>Discount</th>
                  </tr>
                </thead>
                <tbody>
      `;
      orders.forEach(order => {
        const normalDiscount = order.coupon_id ? 0 : order.discount;
        const couponDeduction = order.coupon_id ? order.discount : 0;
        html += `
                  <tr>
                    <td>${order.order_id}</td>
                    <td>${order.user ? order.user.email : 'N/A'}</td>
                    <td>${order.payment_method}</td>
                    <td>${new Date(order.timestamp).toDateString()}</td>
                    <td>₹${order.total.toFixed(2)}</td>
                    <td>₹${normalDiscount}</td>
                  </tr>
        `;
      });
      html += `
                </tbody>
              </table>
            </div>
            <div class="footer">
              Generated by GUITMAN
            </div>
          </div>
        </body>
        </html>
      `;
  
      pdf.create(html).toStream((err, stream) => {
        if (err) {
          return res
            .status(httpStatus.INTERNAL_SERVER_ERROR)
            .json({ error: 'PDF generation error' });
        }
        res.setHeader('Content-type', 'application/pdf');
        res.setHeader('Content-disposition', 'attachment; filename=sales_report.pdf');
        stream.pipe(res);
      });
    } catch (err) {
      next(err);
    }
  },  
  
  exportSalesReportExcel: async (req, res, next) => {
    try {
      let { startDate, endDate, reportType } = req.query;
      let filter = {};
      const today = new Date();
      if (reportType) {
        if (reportType === 'daily') {
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
        } else if (reportType === 'weekly') {
          startDate = new Date();
          startDate.setDate(today.getDate() - 7);
          endDate = new Date();
        } else if (reportType === 'yearly') {
          startDate = new Date(today.getFullYear(), 0, 1);
          endDate = new Date(today.getFullYear(), 11, 31);
        } else if (reportType === 'custom') {
          startDate = new Date(req.query.startDate);
          endDate = new Date(req.query.endDate);
        }
      } else if (startDate && endDate) {
        startDate = new Date(startDate);
        endDate = new Date(endDate);
      }
      if (startDate && endDate) {
        filter.timestamp = { $gte: startDate, $lte: endDate };
      }
      const orders = await Order.find(filter)
        .populate('user', 'name')
        .sort({ timestamp: -1 });
      
      // Compute summary for Excel export.
      const totals = await Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$total' },
            overallDiscount: { $sum: '$discount' },
            count: { $sum: 1 }
          }
        }
      ]);
      const summary = totals[0] || { totalSales: 0, overallDiscount: 0, count: 0 };
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sales Report');
  
      // Add Summary Rows at the Top
      worksheet.addRow([]);
      worksheet.addRow(['Overall Orders', 'Overall Order Amount', 'Overall Discount']);
      worksheet.addRow([summary.count, summary.totalSales, summary.overallDiscount]);
      worksheet.addRow([]);
  
      // Define columns for orders data including Payment Method.
      worksheet.columns = [
        { header: 'Order ID', key: 'order_id', width: 15 },
        { header: 'Billing Name', key: 'billing_name', width: 25 },
        { header: 'Payment Method', key: 'payment_method', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Total Amount', key: 'total', width: 15 },
        { header: 'Normal Discount', key: 'normal_discount', width: 15 },
      ];
  
      orders.forEach(order => {
        const normalDiscount = order.coupon_id ? 0 : order.discount;
        const couponDeduction = order.coupon_id ? order.discount : 0;
        worksheet.addRow({
          order_id: order.order_id,
          billing_name: order.user ? order.user.name : 'N/A',
          payment_method: order.payment_method,
          date: new Date(order.timestamp).toDateString(),
          total: order.total,
          normal_discount: normalDiscount,
          coupon_deduction: couponDeduction
        });
      });
  
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=sales_report.xlsx'
      );
  
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      next(err);
    }
  }  
};

module.exports = salesControls;
