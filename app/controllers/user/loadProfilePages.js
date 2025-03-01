const httpStatus = require("../../utils/httpStatus");
const getUser = require('../../helpers/getUser');
const getCart = require('../../helpers/getCart');
const getAddresses = require("../../helpers/getAddresses");
const DebitCard = require("../../models/debitCardModel");
const Order = require('../../models/orderModel');


const loadProfilePages = {

  /**
   * Renders the user's profile page.
   *
   * @param {Object} req - Express request object containing the user ID in parameters.
   * @param {Object} res - Express response object used to render the profile page.
   * @param {Function} next - Express next middleware function for error handling.
   */
  userProfile: async (req, res, next) => {
    try {
      const addresses = await getAddresses(req,res,next);
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart.items.length;
      const user = await getUser(req, res, next);
      const orders = await Order.find().sort({ timestamp: -1 }).limit(3);

      
      if (!user) {
        return res
          .status(httpStatus.NOT_FOUND)
          .json({ message: "User not found!" });
      }
      res
        .status(httpStatus.OK)
        .render("frontend/profile", {
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
   * @param {Object} req - Express request object containing the user ID in parameters.
   * @param {Object} res - Express response object used to render the profile page.
   * @param {Function} next - Express next middleware function for error handling.
   */

  profileSettings: async (req, res, next) => {
    try {
      const {email_changed} = req.query;
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart.items.length;
      const user = await getUser(req, res, req);
      let emailChange = null;
      if(email_changed){
        emailChange = true;
      }
      console.log(emailChange);
      
      res
        .status(httpStatus.OK)
        .render("frontend/profileSettings", {
          user,
          currentRoute: req.path,
          numOfItemsInCart,
          emailChange,
        });
    } catch (err) {
      next(err);
    }
  },

 /**
   * Renders the user's profile My orders page.
   *
   * @param {Object} req - Express request object containing the user ID in parameters.
   * @param {Object} res - Express response object used to render the profile page.
   * @param {Function} next - Express next middleware function for error handling.
   */
 profileOrders: async (req, res, next) => {
  try {
    const cart = await getCart(req, res, next);
    const numOfItemsInCart = cart.items.length;
    const user = await getUser(req, res, req);
    
    // Pagination logic
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;
    const totalOrders = await Order.countDocuments();
    const orders = await Order.find().sort({ timestamp: -1 }).skip(skip).limit(limit);
    const totalPages = Math.ceil(totalOrders / limit);

    res
      .status(httpStatus.OK)
      .render("frontend/profileOrders", {
        user,
        orders,
        currentRoute: req.path,
        numOfItemsInCart,
        currentPage: page,
        totalPages
      });
  } catch (err) {
    next(err);
  }
},


  /**
   * Renders the user's profile My Addresses page.
   *
   * @param {Object} req - Express request object containing the user ID in parameters.
   * @param {Object} res - Express response object used to render the profile page.
   * @param {Function} next - Express next middleware function for error handling.
   */
  profileAddresses: async(req,res,next) =>{
    try {
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart.items.length;
      const user = await getUser(req, res, req);
      const addresses = await getAddresses(req,res,next);

      res
        .status(httpStatus.OK)
        .render("frontend/profileAddresses", {
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
   * Renders the user's profile My Bucket list page.
   *
   * @param {Object} req - Express request object containing the user ID in parameters.
   * @param {Object} res - Express response object used to render the profile page.
   * @param {Function} next - Express next middleware function for error handling.
   */
  profileBucketList: async(req,res,next) =>{
    try {
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart.items.length;
      const user = await getUser(req, res, req);
      res
        .status(httpStatus.OK)
        .render("frontend/profileBucketList", {
          user,
          currentRoute: req.path,
          numOfItemsInCart,
        });
    } catch (err) {
      next(err);
    }
  },

  profileWallet: async(req,res,next)=>{
    try {
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart.items.length;
      const user = await getUser(req, res, req);
      const debitCards = await DebitCard.find();
      console.log(debitCards);
      
      res
        .status(httpStatus.OK)
        .render("frontend/profileWallet", {
          user,
          currentRoute: req.path,
          numOfItemsInCart,
          debitCards,
        });
    } catch (err) {
      next(err);
    }
  },

  changeEmail: async(req,res,next) =>{
    try {
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart.items.length;
      const user = await getUser(req, res, req);
      res
        .status(httpStatus.OK)
        .render("frontend/changeEmail", {
          user,
          currentRoute: req.path,
          numOfItemsInCart,
        });
    } catch (err) {
      next(err);
    }
  },

  changePassword: async(req,res,next)=>{
    try {
      const cart = await getCart(req, res, next);
      const numOfItemsInCart = cart.items.length;
      const user = await getUser(req, res, req);
      res
        .status(httpStatus.OK)
        .render("frontend/changePassword", {
          user,
          currentRoute: req.path,
          numOfItemsInCart,
        });
    } catch (err) {
      next(err)
    }
  },
  /**
 * Renders the Order Details page.
 *
 * Expects the order_id as a route parameter (e.g., /order-details/:order_id)
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
 orderDetails : async (req, res, next) => {

  
  try {
    const orderId = req.params.orderId;
    const user = await getUser(req,res,next);
    const cart = await getCart(req, res, next);
    const numOfItemsInCart = cart.items.length;
    
    // Find the order by order_id and populate user, address, and product details for each item.
    const order = await Order.findOne({ order_id: orderId })
      .populate('user') // populates order.user
      .populate('address') // populates order.address
      .populate({
        path: 'items.product',
        model: 'Product'
      });

    if (!order) {
      // If order is not found, send a 404 response.
      return res.status(httpStatus.NOT_FOUND).send('Order not found');
    }
    

    // Render the order details view, passing the order object.
    res.status(200).render('frontend/orderDetails', { order,currentRoute: req.path, user, numOfItemsInCart });
  } catch (error) {
    next(error);
  }
}



};

module.exports = loadProfilePages;
