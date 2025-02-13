const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Review = require("../../models/reviewModel");
const Coupon = require("../../models/couponModel");
const User = require("../../models/userModel");
const httpStatus = require("../../utils/httpStatus");

const loadPages = {
  /**
   * Renders the landing page with active categories and top model products.
   *
   * @param {Object} req - Express request object containing path and user data.
   * @param {Object} res - Express response object used to render the landing page.
   * @param {Function} next - Express next middleware function for error handling.
   */
  landing: async (req, res, next) => {
    try {
      const categories = await Category.find({ isBlocked: false });
      const products = await Product.find({ isTopModel: true });
      res.status(httpStatus.OK).render('frontend/landing', {
        products,
        categories,
        currentRoute: req.path,
        user: req.user || null
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the login page.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the login page.
   * @param {Function} next - Express next middleware function (not used here).
   */
  login: (req, res, next) => {
    res.render("frontend/login", {
      email: "",
      errors: {},
      user: null,
      currentRoute: req.path,
    });
  },

  /**
   * Renders the signup page.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the signup page.
   * @param {Function} next - Express next middleware function (not used here).
   */
  signup: (req, res, next) => {
    res.render("frontend/signup", {
      error: null,
      otpError: null,
      showOtpModal: false,
      email: null,
      user: req.user,
      currentRoute: req.path,
    });
  },

  /**
   * Renders the home page, similar to the landing page, with active categories and top model products.
   *
   * @param {Object} req - Express request object containing path and user data.
   * @param {Object} res - Express response object used to render the home page.
   * @param {Function} next - Express next middleware function for error handling.
   */
  home: async (req, res, next) => {
    try {
      const categories = await Category.find({ isBlocked: false });
      const products = await Product.find({ isTopModel: true });
      res.render("frontend/landing", {
        products,
        categories,
        currentRoute: req.path,
        user: req.user || null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the shop page with products filtered, sorted, and paginated based on query parameters.
   *
   * @param {Object} req - Express request object containing query parameters for filtering, sorting, and pagination.
   * @param {Object} res - Express response object used to render the shop page.
   * @param {Function} next - Express next middleware function for error handling.
   */
  loadShop: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 8,
        sort = "createdAt",
        order = "desc",
        search = "",
        category = "all",
        minPrice = 0,
        maxPrice = 100000,
      } = req.query;

      // Build filter object for product search based on price and active status.
      const filter = {
        price: { $gte: Number(minPrice), $lte: Number(maxPrice) },
        isActive: true,
      };

      // Apply category filter if provided.
      if (category !== "all") {
        const categoryDoc = await Category.findOne({
          name: { $regex: new RegExp(`^${category}$`, "i") },
          isBlocked: false,
        });

        if (!categoryDoc) {
          return res.render("frontend/shop", {
            products: [],
            categories: await Category.find({ isBlocked: false }, "name"),
            currentPage: 1,
            totalPages: 0,
            totalProducts: 0,
            sort,
            order,
            search,
            category,
            minPrice,
            maxPrice,
            user: req.user || null,
          });
        }
        filter.category = categoryDoc._id;
      }

      // Apply search filter if provided.
      if (search) {
        filter.$or = [
          { product_name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Set sorting options based on query parameters.
      const sortOption = { [sort]: order === "asc" ? 1 : -1 };

      // Calculate pagination values.
      const skip = (page - 1) * limit;
      const countPromise = Product.countDocuments(filter);
      const productsPromise = Product.find(filter)
        .populate("category", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean();

      const [totalProducts, products] = await Promise.all([countPromise, productsPromise]);
      const totalPages = Math.ceil(totalProducts / limit);
      const breadcrumbs = [{ label: "Shop", url: "/shop" }];

      res.render("frontend/shop", {
        products,
        categories: await Category.find({ isBlocked: false }, "name"),
        currentPage: Number(page),
        totalPages,
        totalProducts,
        sort,
        order,
        search,
        breadcrumbs,
        category,
        minPrice: Number(minPrice),
        maxPrice: Number(maxPrice),
        user: req.user || null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the product details page.
   * - Retrieves product details, reviews, related products, and active coupons.
   * - Computes the average rating and rating distribution.
   *
   * @param {Object} req - Express request object containing the product ID in parameters.
   * @param {Object} res - Express response object used to render the product details page.
   * @param {Function} next - Express next middleware function for error handling.
   */
  loadProductDetails: async (req, res, next) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId)
        .populate("category")
        .populate("offer")
        .lean();

      if (!product) {
        return res.status(httpStatus.NOT_FOUND).send("Product not found");
      }

      const reviews = await Review.find({ product: productId })
        .populate("user", "first_name")
        .lean();

      const avgRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length || 0;

      const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviews.forEach((review) => ratingCounts[review.rating]++);

      const relatedProducts = await Product.find({
        category: product.category._id,
        _id: { $ne: productId },
      })
        .limit(3)
        .lean();

      const coupons = await Coupon.find({
        expire_date: { $gt: new Date() },
      }).lean();

      const breadcrumbs = [
        { label: "Shop", url: "/shop" },
        { label: product.category.name, url: `/shop?category=${product.category.name.toLowerCase()}` },
        { label: product.product_name, url: `/product-details/${product.product_name}` },
      ];

      res.render("frontend/productDetails", {
        product,
        reviews,
        avgRating,
        ratingCounts,
        relatedProducts,
        coupons,
        user: req.user || null,
        breadcrumbs,
        currentRoute: req.path,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the user's profile page.
   *
   * @param {Object} req - Express request object containing the user ID in parameters.
   * @param {Object} res - Express response object used to render the profile page.
   * @param {Function} next - Express next middleware function for error handling.
   */
  userProfile: async (req, res, next) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(httpStatus.NOT_FOUND).json({ message: "User not found!" });
      }
      res.render("frontend/profile", { user });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the tuner page.
   *
   * @param {Object} req - Express request object containing the current route and user data.
   * @param {Object} res - Express response object used to render the tuner page.
   * @param {Function} next - Express next middleware function for error handling.
   */
  tuner: async (req, res, next) => {
    try {
      res.render("frontend/tuner", {
        currentRoute: req.path,
        user: req.user || null,
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = loadPages;
