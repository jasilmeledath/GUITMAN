const httpStatus = require("../../utils/httpStatus");
const getUser = require('../../helpers/getUser');
const getCart = require('../../helpers/getCart');
const getAddresses = require("../../helpers/getAddresses");


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
      
      if (!user) {
        return res
          .status(httpStatus.NOT_FOUND)
          .json({ message: "User not found!" });
      }
      res
        .status(httpStatus.OK)
        .render("frontend/profile", {
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

      res
        .status(httpStatus.OK)
        .render("frontend/profileOrders", {
          user,
          currentRoute: req.path,
          numOfItemsInCart,
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
  }



};

module.exports = loadProfilePages;
