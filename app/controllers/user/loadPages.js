const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Review = require("../../models/reviewModel");
const Coupon = require("../../models/couponModel");
const Cart = require("../../models/cartModel");
const Order = require("../../models/orderModel");
const httpStatus = require("../../utils/httpStatus");
const getUser = require('../../helpers/getUser');
const getCart = require('../../helpers/getCart');
const getWishlist = require('../../helpers/getWishlist');
const getAddresses = require('../../helpers/getAddresses');
const getDebitCards = require('../../helpers/getDebitCards');
const { ObjectId } = require('mongodb');
const {addToRecentlyViewed} = require("../../helpers/addToRecentlyViewed");

const loadPages = {
  /**
   * Renders the landing page with active categories, top model products, and offer details.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  landing: async (req, res, next) => {
    try {
      const categories = await Category.find({ isBlocked: false });
      const products = await Product.find({ isTopModel: true })
        .populate("offer")
        .populate("category", "name");
      const wishlist = await getWishlist(req, res, next);

      // Remove inactive or expired offers
      const now = new Date();
      products.forEach(product => {
        if (product.offer && (!product.offer.isActive || (product.offer.expiry_date && product.offer.expiry_date < now))) {
          product.offer = null;
        }
      });

      res.status(httpStatus.OK).render('frontend/landing', {
        products,
        wishlist,
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
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  contact: async (req, res, next) => {
    try {
      const user = await getUser(req, res, next);
      res.status(httpStatus.OK).render("frontend/contact", {
        email: "",
        errors: {},
        user: user,
        currentRoute: req.path,
        numOfItemsInCart: null
      }); 
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the login page.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
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
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
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
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  resetPassword: (req, res, next) => {
    res.status(httpStatus.OK).render("frontend/resetPassword", {
      error: null,
      otpError: null,
      showOtpModal: false,
      email: null,
      user: req.user,
      currentRoute: req.path,
      numOfItemsInCart: null,
    });
  },

  /**
   * Renders the home page (same as landing) with active categories, top model products, and cart details.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  home: async (req, res, next) => {
    try {
      const categories = await Category.find({ isBlocked: false });
      const products = await Product.find({ isTopModel: true })
        .populate("offer")
        .populate("category", "name");
      const cart = await getCart(req, res, next);
      const user = await getUser(req, res, next);
      const wishlist = await getWishlist(req, res, next);
      const numOfItemsInCart = cart?.items.length || null;

      res.render("frontend/landing", {
        products,
        categories,
        wishlist,
        currentRoute: req.path,
        user: user || null,
        numOfItemsInCart,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the shop page with filtered, sorted, and paginated products.
   *
   * Handles both full-page and AJAX requests.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  loadShop: async (req, res, next) => {
    try {
      // Fetch user, cart and wishlist details
      const user = await getUser(req, res, next);
      const cart = await getCart(req, res, next);
      const wishlist = await getWishlist(req, res, next);
      const numOfItemsInCart = cart?.items.length || 0;
      const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest';

      // Parse and set default query parameters
      let {
        page = 1,
        limit = 12,
        sort = "createdAt",
        order = "desc",
        search = "",
        category = "all",
        minPrice = 0,
        maxPrice = 100000,
      } = req.query;

      page = Number(page);
      limit = Number(limit);
      minPrice = Number(minPrice);
      maxPrice = Number(maxPrice);

      // Build basic filter for active products in specified price range
      const filter = {
        isActive: true,
        price: { $gte: minPrice, $lte: maxPrice },
      };

      // Escape regex special characters in search term
      const escapeRegex = text => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      if (search) {
        const escapedSearch = escapeRegex(search);
        filter.$or = [
          { product_name: { $regex: escapedSearch, $options: "i" } },
          { description: { $regex: escapedSearch, $options: "i" } }
        ];
      }

      // Filter by category if not "all"
      if (category !== "all") {
        if (category.toLowerCase() === "featured") {
          filter.isTopModel = true;
        } else {
          const categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${category}$`, "i") },
            isBlocked: false,
          });
          if (categoryDoc) {
            filter.category = categoryDoc._id;
          }
        }
      }

      // Define sort options based on query parameters
      const sortOptions = {
        "popularity_desc": { sales: -1 },
        "price_asc": { price: 1 },
        "price_desc": { price: -1 },
        "isTopModel_desc": { isTopModel: -1 },
        "product_name_asc": { product_name: 1 },
        "product_name_desc": { product_name: -1 },
        "createdAt_desc": { createdAt: -1 }
      };
      if (sort === "product_name" && !order) order = "asc";
      const sortKey = `${sort}_${order}`;
      const sortCriteria = sortOptions[sortKey] || sortOptions["createdAt_desc"];

      // Execute parallel queries for count, product data, and category list
      const [totalItems, products, categories] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
          .populate("category", "name")
          .populate("offer")
          .sort(sortCriteria)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Category.find({ isBlocked: false }, "name")
      ]);

      // Remove inactive or expired offers from products
      const now = new Date();
      products.forEach(product => {
        if (product.offer && (!product.offer.isActive || (product.offer.expiry_date && product.offer.expiry_date < now))) {
          product.offer = null;
        }
      });

      const totalPages = Math.ceil(totalItems / limit);
      const renderData = {
        products,
        wishlist,
        categories,
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        sort,
        order,
        search,
        breadcrumbs: [{ label: "Shop", url: "/shop" }],
        category,
        minPrice,
        maxPrice,
        user: user || null,
        numOfItemsInCart,
        isAjax
      };

      res.status(httpStatus.OK).render("frontend/shop", renderData);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Provides quick view details for a product.
   *
   * @param {Object} req - Express request object containing the product ID in params.
   * @param {Object} res - Express response object returning JSON data.
   * @param {Function} next - Express next middleware function.
   */
  quickViewProduct: async (req, res, next) => {
    try {
      const user = await getUser(req,res,next);
      const product = await Product.findById(req.params.id)
        .populate("category", "name")
        .populate("offer")
        .lean();
      const productId = product._id;  

      if (!product) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: "Product Not Found"
        });
      }

      // Remove inactive or expired offer
      if (product.offer) {
        const now = new Date();
        if (!product.offer.isActive || (product.offer.expiry_date && product.offer.expiry_date < now)) {
          product.offer = null;
        }
      }
      if(user){
        await addToRecentlyViewed(user._id, productId);
      }
      res.status(httpStatus.OK).json(product);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Renders the product details page.
   * Fetches product data, reviews, related products, coupons, and user cart/wishlist info.
   *
   * @param {Object} req - Express request object with product ID in params.
   * @param {Object} res - Express response object used to render product details.
   * @param {Function} next - Express next middleware function.
   */
  loadProductDetails: async (req, res, next) => {
    try {
      const user = await getUser(req, res, next);
      const productId = req.params.id;
      const product = await Product.findById(productId)
        .populate("category", "name")
        .populate("offer")
        .lean();
      if (!product) {
        return res.status(httpStatus.NOT_FOUND).send("Product not found");
      }

      // Remove inactive or expired offer
      const now = new Date();
      if (product.offer && (!product.offer.isActive || (product.offer.expiry_date && product.offer.expiry_date < now))) {
        product.offer = null;
      }

      const reviews = await Review.find({ product: productId })
        .populate("user", "first_name")
        .lean();

      const avgRating = reviews.length ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
      const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviews.forEach(review => {
        if (ratingCounts[review.rating] !== undefined) ratingCounts[review.rating]++;
      });

      const relatedProducts = await Product.find({
        category: product.category._id,
        _id: { $ne: productId },
      }).limit(3).lean();

      const coupons = await Coupon.find({ expire_date: { $gt: new Date() } }).lean();

      const breadcrumbs = [
        { label: "Shop", url: "/shop" },
        { label: product.category.name, url: `/shop?category=${product.category.name.toLowerCase()}` },
        { label: product.product_name, url: `/product-details/${product.product_name}` },
      ];

      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart?.items?.length || 0;
      const wishlist = await getWishlist(req, res, next);

      if(user){
        await addToRecentlyViewed(user._id, productId);
      }

      return res.status(httpStatus.OK).render("frontend/productDetails", {
        product,
        wishlist,
        reviews,
        avgRating,
        ratingCounts,
        relatedProducts,
        coupons,
        user,
        breadcrumbs,
        currentRoute: req.path,
        numOfItemsInCart,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the tuner page.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the tuner page.
   * @param {Function} next - Express next middleware function.
   */
  tuner: async (req, res, next) => {
    try {
      const user = await getUser(req, res, next);
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart ? cart.items.length : null;

      res.render("frontend/tuner", {
        currentRoute: req.path,
        user: user || null,
        numOfItemsInCart,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the cart page with details about cart items and related products.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the cart page.
   * @param {Function} next - Express next middleware function.
   */
  loadCart: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const user = await getUser(req, res, next);
      let cart = await Cart.findOne({ user: userId, status: 'active' })
        .populate('items.product')
        .exec();

      if (!cart) {
        cart = { items: [], cart_subtotal: 0, tax: 0, shipping_fee: 0, cart_total: 0 };
      } else {
        // Ensure each item has complete product data.
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

      // Fetch "People also bought" products (sample of 4 active products)
      const products = await Product.aggregate([
        { $match: { isActive: true } },
        { $sample: { size: 4 } },
        {
          $lookup: {
            from: 'offers',
            localField: 'offer',
            foreignField: '_id',
            as: 'offerDetails'
          }
        },
        { $unwind: { path: '$offerDetails', preserveNullAndEmptyArrays: true } }
      ]);

      const breadcrumbs = [
        { label: "Shop", url: "/shop" },
        { label: "My cart", url: "/cart/view-cart" }
      ];

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
   * Renders the checkout page with cart details, user addresses, payment methods, and coupons.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the checkout page.
   * @param {Function} next - Express next middleware function.
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
      const cartWithProduct = await Cart.findById(cart._id).populate('items.product');
      
      // Check for out-of-stock items
      const outOfStock = cartWithProduct.items.some(item => item.product.stock === 0);
      if (outOfStock) {
        return res.status(httpStatus.BAD_REQUEST).redirect('/cart/view-cart');
      }

      const appliedCoupon = await Coupon.findById(cart?.couponApplied);
      const validCoupons = await Coupon.find({
        is_active: true,
        expire_date: { $gt: new Date() }
      });

      const cartTotals = {
        subtotal: cart?.cart_subtotal || 0,
        tax: cart?.tax || 0,
        shipping: cart?.shipping_fee || 0,
        total: cart?.cart_total || 0
      };

      res.status(httpStatus.OK).render('frontend/checkout', {
        user,
        appliedCoupon: appliedCoupon || null,
        coupons: validCoupons,
        addresses,
        cards,
        cart: cartWithProduct,
        cartTotals,
        breadcrumbs: null,
        currentRoute: req.path,
        numOfItemsInCart: cart.items.length,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the order confirmation page with order details and coupon information.
   *
   * @param {Object} req - Express request object containing order ID in params.
   * @param {Object} res - Express response object used to render the order confirmation.
   * @param {Function} next - Express next middleware function.
   */
  orderConfirmation: async (req, res, next) => {
    try {
      const user = await getUser(req, res, next);
      const { orderId } = req.params;
      let order;

      // Determine whether orderId is a valid ObjectId
      if (!ObjectId.isValid(orderId)) {
        order = await Order.findOne({ order_id: orderId })
          .populate('items.product')
          .populate('address');
      } else {
        order = await Order.findById(orderId)
          .populate('items.product')
          .populate('address');
      }

      if (!order) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: 'Order not found'
        });
      }

      const buildOrderData = (order) => ({
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
      });

      const orderData = buildOrderData(order);
      const appliedCoupon = await Coupon.findById(order?.coupon_id);

      res.status(httpStatus.OK).render('frontend/orderConfirmed', {
        order: orderData,
        coupon: appliedCoupon || null,
        breadcrumbs: null,
        currentRoute: req.path,
        user,
        numOfItemsInCart: 0,
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = loadPages;
