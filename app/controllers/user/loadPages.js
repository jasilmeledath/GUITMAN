const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Review = require("../../models/reviewModel");
const Coupon = require("../../models/couponModel");
const Cart = require("../../models/cartModel")
const httpStatus = require("../../utils/httpStatus");
const getUser = require('../../helpers/getUser');
const getCart = require('../../helpers/getCart');
const getAddresses = require('../../helpers/getAddresses');
const getDebitCards = require('../../helpers/getDebitCards');
const Order = require('../../models/orderModel');



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
      //Fetch the cart item quantity to load into the header.
      res.status(httpStatus.OK).render('frontend/landing', {
        products,
        categories,
        currentRoute: req.path,
        user: req.user || null,
        numOfItemsInCart: 0,
      });
    } catch (err) {
      next(err);
    }
  },
   /**
   * Renders the contact page.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the login page.
   * @param {Function} next - Express next middleware function (not used here).
   */
   contact: (req, res, next) => {
    res.status(httpStatus.OK).render("frontend/contact", {
      email: "",
      errors: {},
      user: req.user,
      currentRoute: req.path,
      numOfItemsInCart: null
    });
  },

  /**
   * Renders the login page.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the login page.
   * @param {Function} next - Express next middleware function (not used here).
   */
  login: (req, res, next) => {
    res.status(httpStatus.OK).render("frontend/login", {
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
    res.status(httpStatus.OK).render("frontend/signup", {
      error: null,
      otpError: null,
      showOtpModal: false,
      email: null,
      user: req.user,
      currentRoute: req.path,
    });
  },
  /**
   * Renders the reset password page.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the signup page.
   * @param {Function} next - Express next middleware function (not used here).
   */
  resetPassword: (req, res, next) => {
    res.status(httpStatus.OK).render("frontend/resetPassword", {
      error: null,
      otpError: null,
      showOtpModal: false,
      email: null,
      user: req.user,
      currentRoute: req.path,
      numOfItemsInCart:null,
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
      const cart = await getCart(req, res, next);
      const user = await getUser(req, res, next);
      const numOfItemsInCart = cart?.items.length;
      res.render("frontend/landing", {
        products,
        categories,
        currentRoute: req.path,
        user: user || null,
        numOfItemsInCart: numOfItemsInCart || null
      });
    } catch (err) {
      next(err);
    }
  },

  /**
 * Renders the shop page with products filtered, sorted, and paginated based on query parameters.
 * Handles both full page loads and AJAX requests for live updates.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
loadShop: async (req, res, next) => {
  try {
      const user = await getUser(req, res, next);
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart?.items.length || 0;
      const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest';

      // Destructure and parse query parameters
      const {
          page = 1,
          limit = 12,
          sort = "createdAt",
          order = "desc",
          search = "",
          category = "all",
          minPrice = 0,
          maxPrice = 100000,
      } = req.query;

      // Build filter object
      const filter = {
          isActive: true,
          price: { $gte: Number(minPrice), $lte: Number(maxPrice) },
      };

      // Handle category filter
      if (category !== "all") {
          const categoryDoc = await Category.findOne({
              name: { $regex: new RegExp(`^${category}$`, "i") },
              isBlocked: false,
          });
          filter.category = categoryDoc?._id || null;
      }

      // Apply search filter
      if (search) {
          filter.$or = [
              { product_name: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
              { "category.name": { $regex: search, $options: "i" } }
          ];
      }

      // Define sort options
      const sortOptions = {
          "popularity_desc": { sales: -1 },
          "price_asc": { price: 1 },
          "price_desc": { price: -1 },
          "rating_desc": { rating: -1 },
          "isTopModel_desc": { isTopModel: -1 },
          "createdAt_desc": { createdAt: -1 },
          "product_name_asc": { product_name: 1 },
          "product_name_desc": { product_name: -1 }
      };

      // Execute parallel queries
      const [totalItems, products, categories] = await Promise.all([
          Product.countDocuments(filter),
          Product.find(filter)
              .populate("category", "name")
              .sort(sortOptions[`${sort}_${order}`] || { createdAt: -1 })
              .skip((page - 1) * limit)
              .limit(limit)
              .lean(),
          Category.find({ isBlocked: false }, "name")
      ]);

      // Prepare response data
      const renderData = {
          products,
          categories,
          currentPage: Number(page),
          totalPages: Math.ceil(totalItems / limit),
          totalItems,
          itemsPerPage: Number(limit),
          sort,
          order,
          search,
          breadcrumbs: [{ label: "Shop", url: "/shop" }],
          category,
          minPrice: Number(minPrice),
          maxPrice: Number(maxPrice),
          user: user || null,
          numOfItemsInCart,
          isAjax
      };

      // Render appropriate view based on request type
      if (isAjax) {
          res.render("frontend/shop", renderData);
      } else {
          res.render("frontend/shop", renderData);
      }

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
      const user = await getUser(req, res, next);
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

      const cart = await getCart(req, res, next)
      const numOfItemsInCart = cart.items.length;

      res.status(httpStatus.OK).render("frontend/productDetails", {
        product,
        reviews,
        avgRating,
        ratingCounts,
        relatedProducts,
        coupons,
        user: user || null,
        breadcrumbs,
        currentRoute: req.path,
        numOfItemsInCart
      });
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
  },
  /**
   * Renders the cart page.
   *
   * @param {Object} req - Express request object containing the current route and user data.
   * @param {Object} res - Express response object used to render the tuner page.
   * @param {Function} next - Express next middleware function for error handling.
   */
  loadCart: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const user  = await getUser(req,res,next);
      let cart = await Cart.findOne({ user: userId, status: 'active' })
        .populate('items.product')
        .exec();

      if (!cart) {
        cart = {
          items: [],
          cart_subtotal: 0,
          tax: 0,
          shipping_fee: 0,
          cart_total: 0
        };
      } else {
        for (let i = 0; i < cart.items.length; i++) {
          if (!cart.items[i].product || !cart.items[i].product.product_name) {
            const productData = await Product.findById(cart.items[i].product).lean();
            cart.items[i].product = productData;
          }
        }
      }

      let savings = 0;
      cart.items.forEach(item => {
        if (item.discounted_price > 0 && item.discounted_price < item.item_price) {
          savings += (item.item_price - item.discounted_price) * item.quantity;
        }
      });

      // Fetch some products for the "People also bought" section (4 random active products)
      const products = await Product.aggregate([
        { $match: { isActive: true } },
        { $sample: { size: 4 } }
      ]);

      const breadcrumbs = [{ label: "Shop", url: "/shop" }, { label: "My cart", url: "/cart/view-cart" }];
      res.status(httpStatus.OK).render('frontend/cart', {
        cart,
        products,
        savings,
        breadcrumbs,
        currentRoute: req.path,
        user,
        numOfItemsInCart: cart.items.length,
      });
    } catch (err) {
      next(err);
    }
  },
   /**
   * Renders the order confirmation page.
   *
   * @param {Object} req - Express request object containing the current route and user data.
   * @param {Object} res - Express response object used to render the tuner page.
   * @param {Function} next - Express next middleware function for error handling.
   */
  loadCheckout: async (req, res, next) => {
    try {
      const cart = await getCart(req, res, next);
      if (!cart.items.length) {
        return res.status(httpStatus.FORBIDDEN).redirect('/cart/view-cart');
      }

      const user = await getUser(req, res, next);
      const addresses = await getAddresses(req, res, next);
      const cards = await getDebitCards(req, res, next);
      const cartId = cart._id;
      const cartWithProduct = await Cart.findById(cartId).populate('items.product');

      const cartTotals = {
        subtotal: cart ? cart.cart_subtotal : 0,
        tax: cart ? cart.tax : 0,
        shipping: cart ? cart.shipping_fee : 0,
        total: cart ? cart.cart_total : 0
      };

      res.status(httpStatus.OK).render('frontend/checkout', {
        user: req.user,
        addresses,
        cards,
        cart: cartWithProduct,
        cartTotals,
        breadcrumbs: null,
        currentRoute: req.path,
        user: user,
        numOfItemsInCart: cart.items.length,
      });

    } catch (err) {
      next(err);
    }
  },

  orderConfirmation: async (req, res, next) => {
    try {
      const user = await getUser(req, res, next);
      const { orderId } = req.params;
      const order = await Order.findById(orderId)
        .populate('items.product')
        .populate('address');

      if (!order) {
        return res.status(httpStatus.NOT_FOUND).json({success:false, message:'Order not found'});
      }


      const orderData = {
        number: order.order_id,
        date: new Date(order.timestamp).toLocaleDateString(),
        paymentMethod: order.payment_method,
        shippingMethod: 'Standard Shipping', 
        items: order.items.map(item => ({
          image: item.product.images[0] || '/path/to/default-image.jpg',
          name: item.product.product_name,
          variant: item.product.variant || '',
          size: item.product.size || '',
          quantity: item.quantity,
          price: item.price
        })),
        subtotal: order.subtotal,
        shippingCost: order.shipping, 
        discount: order.discount,
        tax: order.tax,
        total: order.total,

        shipping: {
          name: order.address.full_name,
          address1: order.address.address,
          address2: order.address.landmark || '',
          city: order.address.state,
          state: order.address.state,
          zip: order.address.pincode,
          country: order.address.country,
          phone: order.address.contact_number
        },
        billing: {
          name: order.address.full_name,
          address1: order.address.address,
          address2: order.address.landmark || '',
          city: order.address.state,
          state: order.address.state,
          zip: order.address.pincode,
          country: order.address.country,
          phone: order.address.contact_number
        },
        email: order.address.email
      };

      res.status(httpStatus.OK).render('frontend/orderConfirmed', {
        order: orderData,
        breadcrumbs: null,
        currentRoute: req.path,
        user: user,
        numOfItemsInCart: 0,
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = loadPages;
