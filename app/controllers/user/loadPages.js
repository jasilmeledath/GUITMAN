const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Review = require("../../models/reviewModel");
const Coupon = require("../../models/couponModel");
const User = require("../../models/userModel");
const loadPages = {
  login: (req, res) => {
    res.render("frontend/login", {
      email: "",
      errors: {},
      user: null,
      currentRoute: req.path,
    });
  },
  signup: (req, res) => {
    res.render("frontend/signup", {
      error: null,
      otpError: null,
      showOtpModal: false,
      email: null,
      user: req.user,
      currentRoute: req.path,
    });
  },
  home: async (req, res) => {
    try {
      const categories = await Category.find({ isBlocked: false });
      const products = await Product.find({ isTopModel: true });
      res.render("frontend/landing", {
        products,
        categories,
        currentRoute: req.path,
        user: req.user || null,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  loadShop: async (req, res) => {
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

      // Build filter object
      const filter = {
        price: { $gte: Number(minPrice), $lte: Number(maxPrice) },
        isActive: true,
      };

      // Category filter
      if (category !== "all") {
        const categoryDoc = await Category.findOne({
          name: { $regex: new RegExp(`^${category}$`, "i") },
          isBlocked: false,
        });

        if (!categoryDoc) {
          console.log("user", req.user);

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

      // Search filter
      if (search) {
        filter.$or = [
          { product_name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Sorting configuration
      const sortOption = { [sort]: order === "asc" ? 1 : -1 };

      // Pagination calculation
      const skip = (page - 1) * limit;
      const countPromise = Product.countDocuments(filter);
      const productsPromise = Product.find(filter)
        .populate("category", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean();

      const [totalProducts, products] = await Promise.all([
        countPromise,
        productsPromise,
      ]);

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
    } catch (error) {
      console.error("Error loading shop:", error);
      res.status(500).render("error/500");
    }
  },
  loadProductDetails: async (req, res) => {
    try {
      const productId = req.params.id;

      const product = await Product.findById(productId)
        .populate("category")
        .populate("offer")
        .lean();

      const reviews = await Review.find({ product: productId })
        .populate("user", "first_name") // Ensure you get first_name from the User model
        .lean();

      // Calculate average rating
      const avgRating =
        reviews.reduce((acc, review) => acc + review.rating, 0) /
          reviews.length || 0;

      // Calculate rating distribution
      const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviews.forEach((review) => ratingCounts[review.rating]++);

      // Get related products (same category)
      const relatedProducts = await Product.find({
        category: product.category._id,
        _id: { $ne: productId },
      })
        .limit(3)
        .lean();

      // Get valid coupons
      const coupons = await Coupon.find({
        expire_date: { $gt: new Date() },
      }).lean();

      if (!product) {
        return res.status(404).send("Product not found");
      }
      const breadcrumbs = [
        { label: "Shop", url: "/shop" },
        {
          label: product.category.name,
          url: `/shop?category=${product.category.name.toLowerCase()}`,
        },
        {
          label: product.product_name,
          url: `/product-details/${product.product_name}`,
        },
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
    } catch (error) {
      console.error("Error loading product details:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  userProfile: async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ messege: "user not found !" });
      }
      res.render("frontend/profile", { user });
    } catch (error) {
      console.error("Error loading profile", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  
  tuner : async (req, res) => {
    res.render("frontend/tuner",{currentRoute: req.path, user: req.user || null,})
  }
};
module.exports = loadPages;
