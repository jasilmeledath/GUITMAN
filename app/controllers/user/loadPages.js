const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Review = require("../../models/reviewModel");
const Coupon = require("../../models/couponModel");
const Cart = require("../../models/cartModel")
const httpStatus = require("../../utils/httpStatus");
const getUser = require('../../helpers/getUser');
const getCart = require('../../helpers/getCart');
const getWishlist = require('../../helpers/getWishlist');
const getAddresses = require('../../helpers/getAddresses');
const getDebitCards = require('../../helpers/getDebitCards');
const Order = require('../../models/orderModel');
const { ObjectId } = require('mongodb');



const loadPages = {
/**
 * Renders the landing page with active categories, top model products, and offer details.
 *
 * @param {Object} req - Express request object containing path and user data.
 * @param {Object} res - Express response object used to render the landing page.
 * @param {Function} next - Express next middleware function for error handling.
 */
landing: async (req, res, next) => {
  try {
    const categories = await Category.find({ isBlocked: false });
    // Populate the offer field for each product
    const products = await Product.find({ isTopModel: true }).populate("offer").populate("category", "name");
    const wishlist = await getWishlist(req, res, next);

    // Add offer details check: Clear offer if it's inactive or expired.
    const now = new Date();
    products.forEach((product) => {
      if (product.offer) {
        if (!product.offer.isActive || (product.offer.expiry_date && product.offer.expiry_date < now)) {
          product.offer = null;
        }
      }
    });

    // Fetch the cart item quantity to load into the header.
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
   * @param {Object} res - Express response object used to render the login page.
   * @param {Function} next - Express next middleware function (not used here).
   */
   contact: async(req, res, next) => {
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
      next(err)
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
      const products = await Product.find({ isTopModel: true }).populate("offer").populate("category", "name");
      const cart = await getCart(req, res, next);
      const user = await getUser(req, res, next);
      const wishlist = await getWishlist(req,res,next);
      const numOfItemsInCart = cart?.items.length;
      res.render("frontend/landing", {
        products,
        categories,
        wishlist,
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
    // Get user, cart and wishlist. Note that getWishlist now handles expired tokens.
    const user = await getUser(req, res, next);
    const cart = await getCart(req, res, next);
    const wishlist = await getWishlist(req, res, next);
    const numOfItemsInCart = cart?.items.length || 0;
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest';

    // Destructure and parse query parameters with defaults
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

    // Build filter object – only active products within the given price range
    const filter = {
      isActive: true,
      price: { $gte: minPrice, $lte: maxPrice },
    };

    // Helper function to escape regex special characters in the search term
    function escapeRegex(text) {
      return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    // Apply search filter (on product name and description) if search term is provided
    if (search) {
      const escapedSearch = escapeRegex(search);
      filter.$or = [
        { product_name: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } }
      ];
    }

    // Handle category filter:
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

    // Define sort options matching the dropdown in shop.ejs
    const sortOptions = {
      "popularity_desc": { sales: -1 },
      "price_asc": { price: 1 },
      "price_desc": { price: -1 },
      "isTopModel_desc": { isTopModel: -1 },
      "product_name_asc": { product_name: 1 },
      "product_name_desc": { product_name: -1 },
      "createdAt_desc": { createdAt: -1 }
    };

    // For alphabetical sorting, if sort equals 'product_name' and order is not specified, default to asc
    if (sort === "product_name" && !order) {
      order = "asc";
    }

    // Construct sort key and criteria
    const sortKey = `${sort}_${order}`;
    const sortCriteria = sortOptions[sortKey] || sortOptions["createdAt_desc"];

    // Execute parallel queries for total count, products, and available categories
    const [totalItems, products, categories] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate("category", "name")
        .populate("offer") // Populate offer details for each product
        .sort(sortCriteria)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Category.find({ isBlocked: false }, "name")
    ]);

    // Remove offer if it's not active or expired
    const now = new Date();
    products.forEach((product) => {
      if (product.offer) {
        if (!product.offer.isActive || (product.offer.expiry_date && product.offer.expiry_date < now)) {
          product.offer = null;
        }
      }
    });

    const totalPages = Math.ceil(totalItems / limit);

    // Prepare response data – note that the isAjax flag is passed to shop.ejs (for client-side handling)
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

    // Always render the full shop page.
    res.status(httpStatus.OK).render("frontend/shop", renderData);
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
    // Retrieve the user; if token is expired, the helper should return null.
    const user = await getUser(req, res, next);

    const productId = req.params.id;
    const product = await Product.findById(productId)
      .populate("category", "name")
      .populate("offer")
      .lean();

    if (!product) {
      return res.status(httpStatus.NOT_FOUND).send("Product not found");
    }

    // Remove offer if it's not active or expired.
    const now = new Date();
    if (product.offer) {
      if (!product.offer.isActive || (product.offer.expiry_date && product.offer.expiry_date < now)) {
        product.offer = null;
      }
    }

    const reviews = await Review.find({ product: productId })
      .populate("user", "first_name")
      .lean();

    // Calculate average rating safely.
    const avgRating = reviews.length
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      : 0;

    // Build the rating distribution.
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      if (ratingCounts[review.rating] !== undefined) {
        ratingCounts[review.rating]++;
      }
    });

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

    // For cart and wishlist, assume their helpers handle token expiration similarly.
    const cart = await getCart(req, res, next);
    const numOfItemsInCart = cart && cart.items ? cart.items.length : 0;
    const wishlist = await getWishlist(req, res, next);

    return res.status(httpStatus.OK).render("frontend/productDetails", {
      product,
      wishlist,
      reviews,
      avgRating,
      ratingCounts,
      relatedProducts,
      coupons,
      user, // This will be null if the token has expired.
      breadcrumbs,
      currentRoute: req.path,
      numOfItemsInCart,
    });
  } catch (err) {
    return next(err);
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
      const user = await getUser(req, res, next);
      const cart = await getCart(req, res, next);
      if(!cart){
        return res.render("frontend/tuner", {
          currentRoute: req.path,
          user: user || null,
          numOfItemsInCart:null,
        });
      }
      const numOfItemsInCart = cart.items.length;
      res.render("frontend/tuner", {
        currentRoute: req.path,
        user: user || null,
        numOfItemsInCart: numOfItemsInCart,
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
        { $sample: { size: 4 } },
        {
          $lookup: {
            from: 'offers',            // collection name for offers
            localField: 'offer',       // field in Product
            foreignField: '_id',       // field in offers
            as: 'offerDetails'         // alias for joined data
          }
        },
        {
          $unwind: {
            path: '$offerDetails',
            preserveNullAndEmptyArrays: true // in case there is no offer
          }
        }
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
   * Renders the checkout page.
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
      
      let outOfStock = false;
      cartWithProduct.items.some(item => item.product.stock === 0) ? outOfStock=true : outOfStock=false;
      if(outOfStock){
        return res.status(httpStatus.BAD_REQUEST).redirect('/cart/view-cart');
      }

      const appliedCoupon = await Coupon.findById(cart?.couponApplied);
      const validCoupons = await Coupon.find({
        is_active: true,
        expire_date: { $gt: new Date() } 
      });
      

      const cartTotals = {
        subtotal: cart ? cart.cart_subtotal : 0,
        tax: cart ? cart.tax : 0,
        shipping: cart ? cart.shipping_fee : 0,
        total: cart ? cart.cart_total : 0
      };

      res.status(httpStatus.OK).render('frontend/checkout', {
        user: req.user,
        appliedCoupon: appliedCoupon || null,
        coupons: validCoupons,
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
      if(!ObjectId.isValid(orderId)){

        const order = await Order.findOne({order_id:orderId})
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
      const appliedCoupon = await Coupon.findById(order?.coupon_id);
      return res.status(httpStatus.OK).render('frontend/orderConfirmed', {
        order: orderData,
        coupon: appliedCoupon || null, 
        breadcrumbs: null,
        currentRoute: req.path,
        user: user,
        numOfItemsInCart: 0,
      });
      }
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
      const appliedCoupon = await Coupon.findById(order?.coupon_id);
      res.status(httpStatus.OK).render('frontend/orderConfirmed', {
        order: orderData,
        coupon: appliedCoupon || null, 
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
