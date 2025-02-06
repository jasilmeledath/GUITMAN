const Category = require("../../models/categoryModel");
const User = require("../../models/userModel");
const Address = require("../../models/addressModel");
const Offer = require("../../models/offerModel");
const Product = require("../../models/productModel");
const httpStatus = require("../../utils/httpStatus");
const { adminErrors } = require("../../utils/errorMessages");
const { log } = require("console");

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
        page = 1, // Current page (defaults to 1)
        limit = 10, // Products per page
        category, // Filter by category
        status, // Active/Inactive status
        sortBy = "createdAt", // Sorting field
        order = "desc", // Sorting order (asc/desc)
        search = "", // Search query
      } = req.query;
  
      // Fetch categories and offers for filtering options
      const categories = await Category.find({}, "name").lean();
      const offers = await Offer.find({}, "discount").lean();
  
      // Initialize the filter object
      const filter = {};
      if (category) filter.category = category; // Category filter
      if (status) filter.isActive = status === "active"; // Status filter
  
      // Search logic: Match product name or description (case-insensitive)
      if (search) {
        filter.$or = [
          { product_name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }
  
      // Sort options: Default to descending by the `sortBy` field
      const sortOption = { [sortBy]: order === "asc" ? 1 : -1 };
  
      // Fetch products based on filters, sorting, pagination, and population
      const products = await Product.find(filter)
        .populate("category", "name") // Include category name
        .populate("offer", "discount") // Include offer discount
        .sort(sortOption) // Sort results
        .skip((page - 1) * parseInt(limit)) // Skip for pagination
        .limit(parseInt(limit)) // Limit results per page
        .lean();
  
      // Total number of products for pagination
      const totalProducts = await Product.countDocuments(filter);
  
      // Calculate total pages
      const totalPages = Math.ceil(totalProducts / limit);
  
      // Render the `productGrid` view with the required data
      res.status(200).render("backend/productList", {
        products, // List of products to display
        categories, // List of categories for dropdown
        offers, // List of offers for dropdown
        totalPages, // Total number of pages for pagination
        currentPage: parseInt(page), // Current active page
        search, 
        category, // Selected category for dropdown
        status, // Selected status filter
        sortBy, // Current sorting field
        order, // Current sorting order
        limit: parseInt(limit), // Products per page
      });
    } catch (err) {
      console.error("Error in loading product list:", err);
      next(err); // Pass the error to the error-handling middleware
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
      const categories = await Category.find({});
      const offers = await Offer.find({});
      const formData = req.body || {};
      const errors = null;
      res.status(httpStatus.OK).render("backend/addProduct", { categories, offers, formData,errors });
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
      res.status(httpStatus.OK).render("backend/categories", { categories });
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
};

module.exports = loadAdminPage;