/**
 * Coupon Controller Module
 * Handles all coupon-related operations including CRUD operations and page rendering
 * 
 * @module controllers/couponControls
 */

const Coupon = require('../../models/couponModel');
const httpStatus = require('../../utils/httpStatus');
const User = require('../../models/userModel');

const couponControls = {
  /**
   * Renders the coupon management page with pagination
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} Rendered view with coupon data and pagination info
   */
  loadCouponPage: async (req, res, next) => {
    try {
      const perPage = 5;
      const page = parseInt(req.query.page) || 1;
      const totalCoupons = await Coupon.countDocuments({});
      const totalPages = Math.ceil(totalCoupons / perPage);
      const coupons = await Coupon.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage);
      res.status(httpStatus.OK).render('backend/coupons', { coupons, currentPage: page, totalPages });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Creates a new coupon with validation
   * 
   * @param {Object} req - Express request object containing coupon details
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} JSON response indicating success or failure
   */
  createCoupon: async (req, res, next) => {
    try {
      const {
        coupon_code,
        coupon_type,
        discount,
        min_amount,
        max_discount,
        expire_date,
        usage_limit,
        single_use_per_user,
      } = req.body;

      // Validate required fields
      if (!coupon_code || !coupon_type || discount === undefined || !expire_date) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Coupon code, coupon type, discount and expiry date are required."
        });
      }
      // Validate coupon code format: only uppercase letters and digits with at least one digit
      const couponCodePattern = /^(?=.*\d)[A-Z0-9]+$/;
      if (!couponCodePattern.test(coupon_code)) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Coupon code format is invalid. It must contain only uppercase letters and digits with at least one number."
        });
      }

      // Validate coupon type value
      if (!['percentage', 'fixed'].includes(coupon_type)) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Coupon type must be either 'percentage' or 'fixed'."
        });
      }

      // Validate discount value and constraints
      const discountVal = parseFloat(discount);
      if (isNaN(discountVal) || discountVal < 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Discount must be a non-negative number."
        });
      }

      // Percentage discount validation
      if (coupon_type === 'percentage' && discountVal > 99) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Percentage discount cannot exceed 99%."
        });
      }

      // Validate expiry date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(expire_date);
      if (expiryDate < today) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Expiry date must be today or in the future."
        });
      }

      // Validate optional numeric fields
      const minAmount = min_amount !== undefined ? parseFloat(min_amount) : 0;
      if (minAmount < 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Minimum amount cannot be negative."
        });
      }

      const maxDiscount = max_discount !== undefined ? parseFloat(max_discount) : undefined;
      if (maxDiscount !== undefined && maxDiscount < 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Maximum discount cannot be negative."
        });
      }

      const usageLimit = usage_limit !== undefined ? parseInt(usage_limit) : 1;
      if (usageLimit < 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Usage limit cannot be negative."
        });
      }

      // Parse boolean value
      const singleUse = single_use_per_user === 'true';

      // Create and save new coupon
      const newCoupon = new Coupon({
        coupon_code,
        coupon_type,
        discount: discountVal,
        min_amount: minAmount,
        max_discount: maxDiscount,
        expire_date: expiryDate,
        usage_limit: usageLimit,
        single_use_per_user: singleUse,
      });

      await newCoupon.save();
      res.status(httpStatus.OK).json({ success: true, message: "Coupon created successfully!" });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Updates an existing coupon by ID with validation
   * 
   * @param {Object} req - Express request object with coupon ID and updated details
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} JSON response indicating success or failure
   */
  editCoupon: async (req, res, next) => {
    try {
      const { couponId } = req.params;

      // Validate MongoDB ObjectId format
      if (!couponId || !couponId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing coupon ID."
        });
      }

      const {
        coupon_code,
        coupon_type,
        discount,
        min_amount,
        max_discount,
        expire_date,
        usage_limit,
        single_use_per_user,
      } = req.body;

      // Validate required fields
      if (!coupon_code || !coupon_type || discount === undefined || !expire_date) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Coupon code, coupon type, discount, and expiry date are required."
        });
      }

      // Validate coupon code format: only uppercase letters and digits with at least one digit
      const couponCodePattern = /^(?=.*\d)[A-Z0-9]+$/;
      if (!couponCodePattern.test(coupon_code)) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Coupon code format is invalid. It must contain only uppercase letters and digits with at least one number."
        });
      }


      // Validate coupon type
      if (!['percentage', 'fixed'].includes(coupon_type)) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Coupon type must be either 'percentage' or 'fixed'."
        });
      }

      // Validate discount value
      const discountVal = parseFloat(discount);
      if (isNaN(discountVal) || discountVal < 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Discount must be a non-negative number."
        });
      }

      // Percentage type validation
      if (coupon_type === 'percentage' && discountVal > 100) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Percentage discount cannot exceed 100%."
        });
      }

      // Validate expiry date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(expire_date);
      if (expiry < today) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Expiry date must be today or in the future."
        });
      }

      // Validate optional numeric fields
      const minAmount = min_amount !== undefined ? parseFloat(min_amount) : 0;
      if (minAmount < 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Minimum amount cannot be negative."
        });
      }

      const maxDiscount = max_discount !== undefined ? parseFloat(max_discount) : undefined;
      if (maxDiscount !== undefined && maxDiscount < 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Maximum discount cannot be negative."
        });
      }

      const usageLimit = usage_limit !== undefined ? parseInt(usage_limit) : 1;
      if (usageLimit < 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Usage limit cannot be negative."
        });
      }

      const singleUse = (single_use_per_user === 'true' || single_use_per_user === true);

      // Check for duplicate coupon code (excluding the current coupon)
      // NOTE: Bug fix needed - 'id' variable is undefined, should be 'couponId'
      const duplicateCoupon = await Coupon.findOne({ coupon_code, _id: { $ne: couponId } });
      if (duplicateCoupon) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Coupon code already exists. Please choose a different coupon code."
        });
      }

      // Retrieve the existing coupon
      // NOTE: Bug fix needed - 'id' variable is undefined, should be 'couponId'
      const couponToUpdate = await Coupon.findById(couponId);
      if (!couponToUpdate) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: "Coupon not found."
        });
      }

      // Update coupon fields
      couponToUpdate.coupon_code = coupon_code;
      couponToUpdate.coupon_type = coupon_type;
      couponToUpdate.discount = discountVal;
      couponToUpdate.min_amount = minAmount;
      couponToUpdate.max_discount = maxDiscount;
      couponToUpdate.expire_date = expiry;
      couponToUpdate.usage_limit = usageLimit;
      couponToUpdate.single_use_per_user = singleUse;

      await couponToUpdate.save();

      return res.status(httpStatus.OK).json({
        success: true,
        message: "Coupon updated successfully!",
        coupon: couponToUpdate
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Toggles the active status of a coupon
   * 
   * @param {Object} req - Express request object with coupon ID and active status
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} JSON response with updated coupon data
   */
  toggleActive: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      const coupon = await Coupon.findByIdAndUpdate(id, { is_active: is_active }, { new: true });
      if (!coupon) {
        return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "Coupon not found" });
      }

      res.status(httpStatus.OK).json({
        success: true,
        message: `Coupon ${is_active ? 'activated' : 'deactivated'} successfully!`,
        coupon
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Permanently deletes a coupon from the database
   * 
   * @param {Object} req - Express request object with coupon ID
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} JSON response indicating success or failure
   */
  deleteCoupon: async (req, res, next) => {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findByIdAndDelete(id);

      if (!coupon) {
        return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "Coupon not found" });
      }

      res.status(httpStatus.OK).json({ success: true, message: "Coupon deleted successfully!" });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = couponControls;