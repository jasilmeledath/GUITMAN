/**
 * Sales Controller Module
 * Manages sales reporting operations including retrieval and export (PDF/Excel) of sales data.
 *
 * @module controllers/salesControls
 */

const Order = require('../../models/orderModel');
const pdf = require('html-pdf');
const phantomjs = require('phantomjs-prebuilt');
const ExcelJS = require('exceljs');
const httpStatus = require('../../utils/httpStatus');
const { determineDateRange, buildFilter } = require('../../helpers/dateFilter');

const salesControls = {
  /**
   * Retrieves a paginated sales report with aggregated summary.
   *
   * Excludes cancelled and returned orders by building a query filter based on date range and other criteria.
   *
   * @param {Object} req - Express request object containing query parameters for date range, page, and limit.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  getSalesReport: async (req, res, next) => {
    try {
      let { page, limit } = req.query;
      page = parseInt(page) || 1;
      limit = parseInt(limit) || 10;
  
      const dateRange = determineDateRange(req.query, false);
  
      let filter = buildFilter(dateRange);
      filter.order_status = { $nin: ['cancelled'] };
      filter['return_details.status'] = 'none';
  
      const orders = await Order.find(filter)
        .populate('user')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ timestamp: -1 });
  
      const totalOrdersCount = await Order.countDocuments(filter);
  
      // Aggregate sales summary details such as total sales, discounts, and order count
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
  
  /**
   * Exports the sales report as a PDF document.
   *
   * Builds an HTML template for the sales report using order data and aggregates, then generates a PDF stream for download.
   *
   * @param {Object} req - Express request object containing query parameters for date range.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  exportSalesReportPDF: async (req, res, next) => {
    try {
      const dateRange = determineDateRange(req.query, true);
      const filter = buildFilter(dateRange);
  
      const orders = await Order.find(filter)
        .populate('user', 'name email')
        .sort({ timestamp: -1 });
  
      // Aggregate summary values for sales and discounts
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
  
      // Create HTML template for the PDF report
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
              .header p { font-size: 14px; margin: 5px 0 0; }
              .summary { margin: 20px 0; font-size: 14px; }
              .table-container { width: 100%; overflow-x: auto; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 10px;
              }
              table, th, td { border: 1px solid #ddd; }
              th, td { padding: 8px; text-align: left; word-wrap: break-word; }
              th { background-color: #007BFF; color: #fff; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #777; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>GUITMAN Sales Report</h1>
                <p>Report Period: ${dateRange.start.toDateString()} - ${dateRange.end.toDateString()}</p>
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
                  <tbody>`;
  
      // Iterate over orders to populate each row in the PDF report table
      orders.forEach(order => {
        const normalDiscount = order.coupon_id ? 0 : order.discount;
        html += `
                    <tr>
                      <td>${order.order_id}</td>
                      <td>${order.user ? order.user.email : 'N/A'}</td>
                      <td>${order.payment_method}</td>
                      <td>${new Date(order.timestamp).toDateString()}</td>
                      <td>₹${order.total.toFixed(2)}</td>
                      <td>₹${normalDiscount}</td>
                    </tr>`;
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
  
      // Generate a PDF stream from the HTML template using the PhantomJS path option
      const options = {
        phantomPath: phantomjs.path
      };
  
      pdf.create(html, options).toStream((err, stream) => {
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
  
  /**
   * Exports the sales report as an Excel spreadsheet.
   *
   * Uses aggregated data for summary and detailed order data to build an Excel sheet, which is then sent as a downloadable file.
   *
   * @param {Object} req - Express request object containing query parameters for date range.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  exportSalesReportExcel: async (req, res, next) => {
    try {
      const dateRange = determineDateRange(req.query, true);
      const filter = buildFilter(dateRange);
  
      const orders = await Order.find(filter)
        .populate('user', 'name')
        .sort({ timestamp: -1 });
  
      // Aggregate summary data for the Excel report
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
  
      // Create a new Excel workbook and add a worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sales Report');
  
      // Add summary rows at the top of the worksheet
      worksheet.addRow([]);
      worksheet.addRow(['Overall Orders', 'Overall Order Amount', 'Overall Discount']);
      worksheet.addRow([summary.count, summary.totalSales, summary.overallDiscount]);
      worksheet.addRow([]);
  
      // Define columns for order details in the worksheet
      worksheet.columns = [
        { header: 'Order ID', key: 'order_id', width: 15 },
        { header: 'Billing Name', key: 'billing_name', width: 25 },
        { header: 'Payment Method', key: 'payment_method', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Total Amount', key: 'total', width: 15 },
        { header: 'Normal Discount', key: 'normal_discount', width: 15 },
      ];
  
      // Populate worksheet rows with order data
      orders.forEach(order => {
        const normalDiscount = order.coupon_id ? 0 : order.discount;
        worksheet.addRow({
          order_id: order.order_id,
          billing_name: order.user ? order.user.name : 'N/A',
          payment_method: order.payment_method,
          date: new Date(order.timestamp).toDateString(),
          total: order.total,
          normal_discount: normalDiscount,
          coupon_deduction: order.coupon_id ? order.discount : 0
        });
      });
  
      // Set response headers for Excel file download
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=sales_report.xlsx'
      );
  
      // Write the workbook to the response and end the response
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      next(err);
    }
  }
};

module.exports = salesControls;
