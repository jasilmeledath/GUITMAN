const Category = require("../../models/categoryModel");
const User = require("../../models/userModel");
const Address = require("../../models/addressModel");
const Offer = require("../../models/offerModel");
const Product = require("../../models/productModel");
const httpStatus = require("../../utils/httpStatus");
const { adminErrors } = require("../../utils/messages");
const Order = require('../../models/orderModel');

/**
 * Admin page controller responsible for rendering admin views and handling
 * admin-specific data processing.
 * @namespace loadAdminPage
 */
const loadAdminPage = {
  /**
   * Renders the admin login page.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  login: (req, res) => {
    res.status(httpStatus.OK).render("backend/adminLogin");
  },
  
  /**
   * Renders the admin dashboard with comprehensive analytics and reporting.
   * Includes revenue metrics, order statistics, and visualization data.
   * 
   * @param {Object} req - Express request object with optional pagination parameters
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  dashboard: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      // Fetch paginated orders with user details
      const orders = await Order.find()
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email');
  
      const totalOrdersCount = await Order.countDocuments();
      const totalPages = Math.ceil(totalOrdersCount / limit);
  
      // Calculate total revenue from all orders
      const revenueAgg = await Order.aggregate([
        { $group: { _id: null, revenue: { $sum: "$total" } } }
      ]);
      const revenue = revenueAgg[0] ? revenueAgg[0].revenue : 0;
  
      // Get total product count
      const productsCount = await Product.countDocuments();
  
      // Calculate current month's revenue
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyAgg = await Order.aggregate([
        { $match: { timestamp: { $gte: startOfMonth } } },
        { $group: { _id: null, monthlyEarning: { $sum: "$total" } } }
      ]);
      const monthlyEarning = monthlyAgg[0] ? monthlyAgg[0].monthlyEarning : 0;
  
      // Generate yearly sales data for chart visualization
      const chartDataYearlyAgg = await Order.aggregate([
        { 
          $group: { 
            _id: { $dateToString: { format: "%Y", date: "$timestamp" } },
            totalSales: { $sum: "$total" }
          } 
        },
        { $sort: { _id: 1 } }
      ]);
      const chartDataYearlyLabels = chartDataYearlyAgg.map(item => item._id);
      const chartDataYearlySales = chartDataYearlyAgg.map(item => item.totalSales);
  
      // Generate monthly sales data for chart visualization
      const chartDataMonthlyAgg = await Order.aggregate([
        { 
          $group: { 
            _id: { $dateToString: { format: "%Y-%m", date: "$timestamp" } },
            totalSales: { $sum: "$total" }
          } 
        },
        { $sort: { _id: 1 } }
      ]);
      const chartDataMonthlyLabels = chartDataMonthlyAgg.map(item => item._id);
      const chartDataMonthlySales = chartDataMonthlyAgg.map(item => item.totalSales);
  
      // Generate daily sales data for chart visualization
      const chartDataDailyAgg = await Order.aggregate([
        { 
          $group: { 
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            totalSales: { $sum: "$total" }
          } 
        },
        { $sort: { _id: 1 } }
      ]);
      const chartDataDailyLabels = chartDataDailyAgg.map(item => item._id);
      const chartDataDailySales = chartDataDailyAgg.map(item => item.totalSales);
  
      // Identify top 10 best-selling products
      const bestSellingProductsAgg = await Order.aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalQuantity: { $sum: "$items.quantity" }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
      ]);
      const productIds = bestSellingProductsAgg.map(item => item._id);
      const products = await Product.find({ _id: { $in: productIds } });
      const bestSellingProducts = bestSellingProductsAgg.map(item => {
        const product = products.find(p => p._id.toString() === item._id.toString());
        return { ...product.toObject(), totalQuantity: item.totalQuantity };
      });
  
      // Identify top 10 best-selling categories
      const bestSellingCategoriesAgg = await Order.aggregate([
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.category",
            totalQuantity: { $sum: "$items.quantity" }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
      ]);
      const categoryIds = bestSellingCategoriesAgg.map(item => item._id);
      const categories = await Category.find({ _id: { $in: categoryIds } });
      const bestSellingCategories = bestSellingCategoriesAgg.map(item => {
        const category = categories.find(c => c._id.toString() === item._id.toString());
        return { ...category.toObject(), totalQuantity: item.totalQuantity };
      });
  
      // Identify top 10 best-selling brands
      const bestSellingBrandsAgg = await Order.aggregate([
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.brand",
            totalQuantity: { $sum: "$items.quantity" }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
      ]);
      const bestSellingBrands = bestSellingBrandsAgg.filter(item => item._id);
  
      // Render dashboard with compiled analytics data
      res.status(httpStatus.OK).render("backend/dashboard", {
        orders,
        pagination: {
          page,
          limit,
          totalPages,
          totalOrders: totalOrdersCount
        },
        revenue,
        ordersCount: totalOrdersCount,
        productsCount,
        monthlyEarning,
        chartDataYearlyLabels,
        chartDataYearlySales,
        chartDataMonthlyLabels,
        chartDataMonthlySales,
        chartDataDailyLabels,
        chartDataDailySales,
        bestSellingProducts,
        bestSellingCategories,
        bestSellingBrands
      });
    } catch (err) {
      next(err);
    }
  },  
  
  /**
   * Fetches a paginated and filtered list of users for admin management.
   * Supports search by name/email and status filtering.
   *
   * @param {Object} req - Express request object containing query parameters
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  userList: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, search = "", status = "all" } = req.query;

      // Build query filter based on search and status parameters
      const query = {};
      if (search) {
        query.$or = [
          { first_name: { $regex: search, $options: "i" } }, 
          { last_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      if (status !== "all") {
        query.isActive = status === "active";
      }

      // Calculate pagination metadata
      const totalUsers = await User.countDocuments(query);
      const totalPages = Math.ceil(totalUsers / limit);

      // Fetch paginated user data
      const users = await User.find(query)
        .skip((page - 1) * limit)
        .limit(Number(limit));

      res.status(httpStatus.OK).render("backend/userList", {
        users,
        currentPage: Number(page),
        totalPages,
        search,
        status,
        limit: Number(limit),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the user cards view with a card-based layout of users.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  userCards: (req, res) => {
    res.status(httpStatus.OK).render("backend/userCards");
  },

  /**
   * Displays detailed user information including associated addresses.
   * Provides empty address placeholder if no addresses are found.
   *
   * @param {Object} req - Express request object with user ID parameter
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  userDetails: async (req, res, next) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);
      const addresses = await Address.find({ user: userId });

      if (!user) {
        return res
          .status(httpStatus.NOT_FOUND)
          .render("404", { message: adminErrors.userManagement.userNotFound });
      }

      // Provide empty address placeholder if user has no saved addresses
      if (!addresses.length) {
        addresses[0] = { country: " ", address: " ", pincode: " " };
      }

      res.status(httpStatus.OK).render("backend/userDetails", { user, addresses });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Displays the product listing with comprehensive filtering, sorting and pagination.
   * Supports category filtering, status filtering, search, and customizable sort options.
   *
   * @param {Object} req - Express request object with query parameters
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  productList: async (req, res, next) => {
    try {
      const {
        page = 1, 
        limit = 5, 
        category,
        status, 
        sortBy = "createdAt", 
        order = "desc", 
        search = "", 
      } = req.query;

      // Fetch reference data for dropdowns
      const categories = await Category.find({}, "name").lean();
      const offers = await Offer.find({}, "discount").lean();

      // Build filter criteria based on request parameters
      const filter = {};
      if (category) filter.category = category; 
      if (status && status !== "all") filter.isActive = status === "active"; 

      if (search) {
        filter.$or = [
          { product_name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Configure sorting and pagination
      const sortOption = { [sortBy]: order === "asc" ? 1 : -1 };
      const parsedLimit = parseInt(limit);
      const parsedPage = parseInt(page);

      // Execute product query with all filters and options
      const products = await Product.find(filter)
        .populate("category", "name") 
        .sort(sortOption) 
        .skip((parsedPage - 1) * parsedLimit) 
        .limit(parsedLimit) 
        .lean();

      // Calculate pagination metadata
      const totalProducts = await Product.countDocuments(filter);
      const totalPages = Math.ceil(totalProducts / parsedLimit);

      res.status(httpStatus.OK).render("backend/productList", {
        products, 
        categories, 
        offers, 
        totalProducts, 
        totalPages, 
        currentPage: parsedPage, 
        search, 
        category,
        status, 
        sortBy,
        order, 
        limit: parsedLimit, 
      });
    } catch (err) {
      console.error("Error in loading product list:", err);
      next(err); 
    }
  },

  /**
   * Displays detailed information for a specific product.
   *
   * @param {Object} req - Express request object with product ID parameter
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  productDetails: async (req, res, next) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);
      const user = req.user;

      if (!product) {
        return res
          .status(httpStatus.NOT_FOUND)
          .render("404", { message: adminErrors.productManagement.productNotFound });
      }

      res.status(httpStatus.OK).render("backend/productDetails", { product, user });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the product creation form with categories and offers data.
   * Supports form validation by maintaining form state and errors between submissions.
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  addProduct: async (req, res, next) => {
    try {
      // Retrieve any validation errors and form data from previous submission
      const errors = req.session.errors || {};
      const formData = req.session.formData || {};
  
      // Clear session data to prevent persisting across requests
      delete req.session.errors;
      delete req.session.formData;
  
      // Fetch data for form dropdowns
      const categories = await Category.find({});
      const offers = await Offer.find({});
      
      res.status(200).render("backend/addProduct", {
        categories,
        offers,
        formData,
        errors
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the product edit form with pre-populated data.
   *
   * @param {Object} req - Express request object with product ID parameter
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  editProduct: async (req, res, next) => {
    try {
      // Fetch product with associated category and offer data
      const product = await Product.findById(req.params.id)
        .populate('category')
        .populate('offer');
          
      if (!product) {
        return res.status(httpStatus).render("404");
      }
    
      // Get categories and offers for form dropdowns
      const categories = await Category.find();
      const offers = await Offer.find();
    
      res.render('backend/editProduct', { product, categories, offers });
    } catch (err) {
      next(err); 
    }
  },

  /**
   * Renders the category management page.
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  categories: async (req, res, next) => {
    try {
      const categories = await Category.find({});
      const error = null;
      res.status(httpStatus.OK).render("backend/categories", { categories, error: error });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the offers management page with pagination.
   * Includes related products and categories for offer assignment.
   *
   * @param {Object} req - Express request object with pagination parameters
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  loadOffers: async (req, res, next) => {
    try {
      // Configure pagination
      const page = parseInt(req.query.page) || 1;
      const limit = 10; 
      const skip = (page - 1) * limit;
      
      // Fetch offers with populated product and category data
      const offers = await Offer.find({})
        .populate('products')
        .populate('categories')
        .skip(skip)
        .limit(limit);
        
      // Fetch available products and categories for offer assignment
      const products = await Product.find({});
      const categories = await Category.find({});
      
      // Calculate pagination metadata
      const count = await Offer.countDocuments({});
      const totalPages = Math.ceil(count / limit);
      
      res.status(httpStatus.OK).render("backend/offers", { 
        offers, 
        products, 
        categories, 
        currentPage: page, 
        totalPages 
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Lists orders with pagination, search, and status filtering.
   * 
   * @param {Object} req - Express request object with query parameters
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getOrders: async (req, res, next) => {
    try {
      // Parse and validate query parameters
      let page = parseInt(req.query.page) || 1;
      let limit = parseInt(req.query.limit) || 20;
      let searchQuery = req.query.search || '';
      let statusFilter = req.query.status || '';

      // Build filter criteria
      let filter = {};

      if (searchQuery) {
        filter.order_id = { $regex: searchQuery, $options: 'i' };
      }

      if (statusFilter) {
        filter.order_status = statusFilter.toLowerCase();
      }

      // Calculate pagination offsets
      const skip = (page - 1) * limit;
      const totalOrders = await Order.countDocuments(filter);
      const totalPages = Math.ceil(totalOrders / limit);

      // Fetch orders with user details
      const orders = await Order.find(filter)
        .populate('user', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
        
      res.render('backend/orders', {
        orders,
        currentPage: page,
        totalPages,
        searchQuery,
        statusFilter,
        limit
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Lists return requests with pagination, search, and status filtering.
   * 
   * @param {Object} req - Express request object with query parameters
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getReturnReqOrders: async (req, res, next) => {
    try {
      // Parse and validate query parameters
      let page = parseInt(req.query.page) || 1;
      let limit = parseInt(req.query.limit) || 20;
      let searchQuery = req.query.search || '';
      let statusFilter = req.query.status || '';

      // Build filter criteria
      let filter = {};

      if (searchQuery) {
        filter.order_id = { $regex: searchQuery, $options: 'i' };
      }

      if (statusFilter) {
        filter.order_status = statusFilter.toLowerCase();
      }

      // Calculate pagination offsets
      const skip = (page - 1) * limit;
      const totalOrders = await Order.countDocuments(filter);
      const totalPages = Math.ceil(totalOrders / limit);

      // Fetch orders with user details
      const orders = await Order.find(filter)
        .populate('user', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
        
      res.render('backend/returnRequests', {
        orders,
        currentPage: page,
        totalPages,
        searchQuery,
        statusFilter,
        limit
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Displays detailed information for a specific order.
   * Includes associated product details, user information, and address data.
   *
   * @param {Object} req - Express request object with order ID parameter
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  orderDetail: async (req, res, next) => {
    try {
      const orderId = req.params.orderId;
      
      // Fetch order with all related entities
      const order = await Order.findOne({ order_id: orderId })
        .populate('items.product')
        .populate('user')
        .populate('address')
        .lean();

      if (!order) {
        return res.status(httpStatus.NOT_FOUND).send("Order not found");
      }

      // Format timestamp for user-friendly display
      order.formattedDate = new Date(order.timestamp).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });

      // Calculate total item count
      order.totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

      res.status(httpStatus.OK).render('backend/orderDetails', { order });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = loadAdminPage;