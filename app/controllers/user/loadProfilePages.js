const httpStatus = require("../../utils/httpStatus");
const getUser = require('../../helpers/getUser');
const getCart = require('../../helpers/getCart');
const getAddresses = require("../../helpers/getAddresses");
const DebitCard = require("../../models/debitCardModel");
const Order = require('../../models/orderModel');
const Wallet = require('../../models/walletModel');
const Transactions = require('../../models/transactionDetails');
const Wishlist = require('../../models/wishlistModel');

const loadProfilePages = {
  /**
   * Renders the user's profile page with recent orders and saved addresses.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the profile page.
   * @param {Function} next - Express next middleware function.
   */
  userProfile: async (req, res, next) => {
    try {
      const addresses = await getAddresses(req, res, next);
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart?.items?.length || 0;
      const user = await getUser(req, res, next);
      const orders = await Order.find().sort({ timestamp: -1 }).limit(3);

      if (!user) {
        return res
          .status(httpStatus.NOT_FOUND)
          .json({ message: "User not found!" });
      }

      res.status(httpStatus.OK).render("frontend/profile", {
        user,
        orders,
        currentRoute: req.path,
        numOfItemsInCart,
        addresses: addresses || null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the user's profile settings page.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the profile settings page.
   * @param {Function} next - Express next middleware function.
   */
  profileSettings: async (req, res, next) => {
    try {
      const { email_changed } = req.query;
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart?.items?.length || 0;
      const user = await getUser(req, res, next);
      // Set email change flag if present
      const emailChange = email_changed ? true : null;
      
      res.status(httpStatus.OK).render("frontend/profileSettings", {
        user,
        currentRoute: req.path,
        numOfItemsInCart,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the user's orders page, paginated.
   *
   * @param {Object} req - Express request object containing the page number and user ID.
   * @param {Object} res - Express response object used to render the orders page.
   * @param {Function} next - Express next middleware function.
   */
  profileOrders: async (req, res, next) => {
    try {
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart?.items?.length || 0;
      const user = await getUser(req, res, next);
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const totalOrders = await Order.countDocuments({ user: user._id });
      const orders = await Order.find({ user: user._id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.product')
        .populate('address')
        .exec();

      const totalPages = Math.ceil(totalOrders / limit);

      res.status(httpStatus.OK).render("frontend/profileOrders", {
        user,
        orders,
        currentRoute: req.path,
        numOfItemsInCart,
        currentPage: page,
        totalPages,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the user's addresses page.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the addresses page.
   * @param {Function} next - Express next middleware function.
   */
  profileAddresses: async (req, res, next) => {
    try {
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart?.items?.length || 0;
      const user = await getUser(req, res, next);
      const addresses = await getAddresses(req, res, next);

      res.status(httpStatus.OK).render("frontend/profileAddresses", {
        user,
        currentRoute: req.path,
        numOfItemsInCart,
        addresses: addresses || null,
      });
    } catch (err) {
      next(err);
    }
  },

/**
 * Renders the user's bucket list (wishlist) page with pagination.
 *
 * Retrieves the current cart and user, fetches the wishlist (populated with product details and recently viewed items),
 * calculates pagination details, and renders the profileBucketList EJS template with the required data.
 *
 * @param {Object} req - Express request object, expecting a "page" query parameter for pagination.
 * @param {Object} res - Express response object used to render the bucket list page.
 * @param {Function} next - Express next middleware function.
 */
profileBucketList: async (req, res, next) => {
  try {
    const cart = await getCart(req, res, next);
    const numOfItemsInCart = cart?.items?.length || 0;
    const user = await getUser(req, res, next);
    let wishlist = await Wishlist.findOne({ user: user._id })
      .populate('items.product')
      .populate('recentlyViewed.product');

    if (!wishlist) {
      wishlist = { items: [], recentlyViewed: [] };
    }

    const page = parseInt(req.query.page) || 1;
    const perPage = 8; 
    const totalItems = wishlist.items.length;
    const totalPages = Math.ceil(totalItems / perPage) || 1;
    const startIndex = (page - 1) * perPage;
    const paginatedItems = wishlist.items.slice(startIndex, startIndex + perPage);
    wishlist.items = paginatedItems;
    
    res.status(httpStatus.OK).render("frontend/profileBucketList", {
      user,
      currentRoute: req.path,
      numOfItemsInCart,
      wishlist,
      recentlyViewed: wishlist.recentlyViewed || [],
      currentPage: page,
      totalPages
    });
  } catch (err) {
    next(err);
  }
},



  /**
   * Renders the user's wallet page with debit card details and paginated transaction history.
   *
   * @param {Object} req - Express request object containing pagination and filter query parameters.
   * @param {Object} res - Express response object used to render the wallet page.
   * @param {Function} next - Express next middleware function.
   */
  profileWallet: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const { type, dateRange, search } = req.query;
      const user = await getUser(req, res, next);
      const debitCards = await DebitCard.find();
      const userId = user._id;

      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        wallet = new Wallet({ user: userId });
        await wallet.save();
      }

      // Build filter for transactions
      let transactionFilter = { user: userId };
      if (type && type !== 'all') {
        transactionFilter.transaction_type = type;
      }

      // Filter transactions by date range
      if (dateRange && dateRange !== 'all') {
        let fromDate;
        const now = new Date();
        switch (dateRange) {
          case 'last30Days':
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last7Days':
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'thisMonth':
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'lastMonth':
            fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const toDate = new Date(now.getFullYear(), now.getMonth(), 0);
            transactionFilter.date = { $gte: fromDate, $lte: toDate };
            break;
          default:
            break;
        }
        if (fromDate && dateRange !== 'lastMonth') {
          transactionFilter.date = { $gte: fromDate };
        }
      }

      // Apply search filter on description if provided
      if (search) {
        transactionFilter.description = { $regex: search, $options: 'i' };
      }

      const totalTransactions = await Transactions.countDocuments(transactionFilter);
      const transactions = await Transactions.find(transactionFilter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart?.items?.length || 0;

      res.status(httpStatus.OK).render("frontend/profileWallet", {
        user,
        currentRoute: req.path,
        numOfItemsInCart,
        debitCards,
        wallet,
        transactions,
        totalTransactions,
        currentPage: page,
        totalPages: Math.ceil(totalTransactions / limit),
        type,
        dateRange,
        search,
        limit,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the change email page.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the change email page.
   * @param {Function} next - Express next middleware function.
   */
  changeEmail: async (req, res, next) => {
    try {
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart?.items?.length || 0;
      const user = await getUser(req, res, next);
      res.status(httpStatus.OK).render("frontend/changeEmail", {
        user,
        currentRoute: req.path,
        numOfItemsInCart,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the change password page.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object used to render the change password page.
   * @param {Function} next - Express next middleware function.
   */
  changePassword: async (req, res, next) => {
    try {
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart?.items?.length || 0;
      const user = await getUser(req, res, next);
      res.status(httpStatus.OK).render("frontend/changePassword", {
        user,
        currentRoute: req.path,
        numOfItemsInCart,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Renders the Order Details page for a specific order.
   *
   * @param {Object} req - Express request object containing the order ID in parameters.
   * @param {Object} res - Express response object used to render the order details page.
   * @param {Function} next - Express next middleware function.
   */
  orderDetails: async (req, res, next) => {
    try {
      const orderId = req.params.orderId;
      const user = await getUser(req, res, next);
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart?.items?.length || 0;
      
      // Find the order by order_id and populate its details
      const order = await Order.findOne({ order_id: orderId })
        .populate('user')
        .populate('address')
        .populate({
          path: 'items.product',
          model: 'Product'
        });
      
      if (!order) {
        return res.status(httpStatus.NOT_FOUND).send('Order not found');
      }
      
      res.status(httpStatus.OK).render('frontend/orderDetails', {
        order,
        currentRoute: req.path,
        user,
        numOfItemsInCart,
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = loadProfilePages;
