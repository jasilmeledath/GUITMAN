const Category = require("../../models/categoryModel");
const User = require("../../models/userModel");
const Address = require("../../models/addressModel");
const Offer = require("../../models/offerModel");
const Product = require("../../models/productModel");
const httpStatus = require("../../utils/httpStatus");
const { adminErrors } = require("../../utils/messages");
const Order = require('../../models/orderModel');


const loadAdminPage = {
  /**
   * Renders the admin login page.
   */
  login: (req, res) => {
    res.status(httpStatus.OK).render("backend/adminLogin");
  },

  /**
   * Renders the admin dashboard page.
   */
  dashboard: (req, res) => {
    res.status(httpStatus.OK).render("backend/dashboard");
  },

  /**
   * Fetches a paginated and filtered list of users.
   * - Supports search queries based on first name, last name, or email.
   * - Allows filtering by active/inactive status.
   * - Implements pagination with default values.
   *
   * @param {Object} req - Express request object containing query parameters.
   * @param {Object} res - Express response object to send back the result.
   * @param {Function} next - Express next function for error handling.
   */
  userList: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, search = "", status = "all" } = req.query;

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

      const totalUsers = await User.countDocuments(query);
      const totalPages = Math.ceil(totalUsers / limit);

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
   * Renders the user cards view.
   */
  userCards: (req, res) => {
    res.status(httpStatus.OK).render("backend/userCards");
  },

  /**
   * Fetches user details along with their saved addresses.
   * - If no addresses are found, assigns default empty values.
   * - Renders the user details page.
   *
   * @param {Object} req - Express request object containing user ID.
   * @param {Object} res - Express response object to send back the result.
   * @param {Function} next - Express next function for error handling.
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

      if (!addresses.length) {
        addresses[0] = { country: " ", address: " ", pincode: " " };
      }

      res.status(httpStatus.OK).render("backend/userDetails", { user, addresses });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Loads and renders available offers.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next function for error handling.
   */
  loadOffers: async (req, res, next) => {
    try {
      const offers = await Offer.find({});
      res.status(httpStatus.OK).render("backend/offers", { offers });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Fetches a paginated and filtered list of products.
   * - Supports filtering by category and active status.
   * - Implements sorting and pagination.
   * - Populates related category and offer data.
   *
   * @param {Object} req - Express request object containing query parameters.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next function for error handling.
   */
  productList: async (req, res, next) => {
    try {
      const {
        page = 1, 
        limit = 10, 
        category,
        status, 
        sortBy = "createdAt", 
        order = "desc", 
        search = "", 
      } = req.query;
  
      const categories = await Category.find({}, "name").lean();
      const offers = await Offer.find({}, "discount").lean();
  
      const filter = {};
      if (category) filter.category = category; 
      if (status) filter.isActive = status === "active"; 
  
      if (search) {
        filter.$or = [
          { product_name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }
  
      const sortOption = { [sortBy]: order === "asc" ? 1 : -1 };
  
      const products = await Product.find(filter)
        .populate("category", "name") 
        .populate("offer", "discount") 
        .sort(sortOption) 
        .skip((page - 1) * parseInt(limit)) 
        .limit(parseInt(limit)) 
        .lean();
  
      const totalProducts = await Product.countDocuments(filter);
  
      const totalPages = Math.ceil(totalProducts / limit);
  
      res.status(httpStatus.OK).render("backend/productList", {
        products, 
        categories, 
        offers, 
        totalPages, 
        currentPage: parseInt(page), 
        search, 
        category,
        status, 
        sortBy,
        order, 
        limit: parseInt(limit), 
      });
    } catch (err) {
      console.error("Error in loading product list:", err);
      next(err); 
    }
  },
  /**
   * Fetches product details by ID and renders the product details page.
   *
   * @param {Object} req - Express request object containing product ID.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next function for error handling.
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
   * Renders the add product page with categories and available offers.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next function for error handling.
   */
  addProduct: async (req, res, next) => {
    try {
      const errors = req.session.errors || {};
      const formData = req.session.formData || {};
  
      delete req.session.errors;
      delete req.session.formData;
  
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

  editProduct:async (req, res, next) => {
      try {
        const product = await Product.findById(req.params.id)
          .populate('category')
          .populate('offer');
          
        if (!product) {
          return res.status(httpStatus).render("404");
        }
    
        const categories = await Category.find();
        const offers = await Offer.find();
    
        res.render('backend/editProduct', { product, categories, offers });
      } catch (err) {
        next(err); 
      }
    },

  /**
   * Loads and renders the categories page.
   */
  categories: async (req, res, next) => {
    try {
      const categories = await Category.find({});
      const error = null;
      res.status(httpStatus.OK).render("backend/categories", { categories, error:error });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Loads and renders the offers page.
   */
  offers: async (req, res, next) => {
    try {
      const offers = await Offer.find({});
      res.status(httpStatus.OK).render("backend/offers", { offers });
    } catch (err) {
      next(err);
    }
  },
  /**
 * Controller function to list orders for the admin panel.
 * Supports pagination, search (by order ID), and status filtering.
 *
 * Query Parameters:
 *  - page: (number) current page, defaults to 1
 *  - limit: (number) orders per page, defaults to 20
 *  - search: (string) search term for order_id
 *  - status: (string) order status filter (pending, processing, shipped, delivered, cancelled)
 *
 * Renders: views/admin/orders.ejs with variables:
 *   orders, currentPage, totalPages, searchQuery, statusFilter, limit
 */
getOrders : async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    let searchQuery = req.query.search || '';
    let statusFilter = req.query.status || '';

    let filter = {};

    if (searchQuery) {
      // Search order_id using a case-insensitive regex
      filter.order_id = { $regex: searchQuery, $options: 'i' };
    }

    if (statusFilter) {
      // Filter by order_status; assuming stored in lowercase
      filter.order_status = statusFilter.toLowerCase();
    }

    const skip = (page - 1) * limit;
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

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
orderDetail: async (req, res, next) => {
  try {
    const orderId = req.params.orderId; // e.g. /order-details/:orderId
    const order = await Order.findOne({ order_id: orderId })
      .populate('items.product')
      .populate('user')
      .populate('address')
      .lean();

    if (!order) {
      return res.status(httpStatus.NOT_FOUND).send("Order not found");
    }

    // Format the timestamp for display
    order.formattedDate = new Date(order.timestamp).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });

    // Calculate total items (if needed)
    order.totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

    res.status(httpStatus.OK).render('backend/orderDetails', { order });
  } catch (err) {
    next(err);
  }
}
};

module.exports = loadAdminPage;