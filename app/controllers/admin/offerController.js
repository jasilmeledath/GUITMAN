const Product = require("../../models/productModel");
const Offer = require("../../models/offerModel");
const httpStatus = require("../../utils/httpStatus");

/**
 * Controller for managing promotional offers in the e-commerce system.
 * Handles CRUD operations for product-based, category-based and referral offers.
 * 
 * @namespace offerControls
 */
const offerControls = {
  /**
   * Creates a new offer based on offer type (product, category, or referral).
   * Validates input data and applies offer references to associated products.
   *
   * @param {Object} req - Express request object with offer data in body
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} JSON response with status and offer details
   */
  addOffer: async (req, res, next) => {
    try {
      const {
        offer_type,
        offer_percentage,
        expiry_date,
        products,
        categories,
        referral_code,
        referral_bonus
      } = req.body;

      if (!offer_type || !expiry_date) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Offer type and expiry date are required.'
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const offerExpiryDate = new Date(expiry_date);
      if (offerExpiryDate < today) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Expiry date must be today or a future date.'
        });
      }

      if (offer_percentage < 0 || offer_percentage > 100) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Offer percentage should be between 0-100% !'
        });
      }

      if (offer_type === 'referral') {
        if (!referral_code || referral_code.trim() === '') {
          return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Referral code is required for referral offers.'
          });
        }
        
        if (referral_bonus < 0) {
          return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Referral bonus cannot be negative.'
          });
        }
      }

      if (categories) {
        const isExistingCatOffer = await Offer.findOne({ categories: [categories] });
        if (isExistingCatOffer) {
          return res.status(httpStatus.BAD_REQUEST)
            .json({
              success: false,
              message: "Offer for this category already exists! Please edit the existing category."
            });
        }
      }

      const newOffer = new Offer({
        offer_type,
        offer_percentage,
        expiry_date,
        referral_code: offer_type === 'referral' ? referral_code : undefined,
        referral_bonus: offer_type === 'referral' ? referral_bonus : 0
      });

      if (offer_type === 'product' && products) {
        newOffer.products = Array.isArray(products) ? products : [products];
      }

      if (offer_type === 'category' && categories) {
        newOffer.categories = Array.isArray(categories) ? categories : [categories];
      }

      const savedOffer = await newOffer.save();

      if (offer_type === 'product' && newOffer.products && newOffer.products.length > 0) {
        await Product.updateMany(
          { _id: { $in: newOffer.products } },
          { $set: { offer: savedOffer._id } }
        );
      }

      if (offer_type === 'category' && newOffer.categories && newOffer.categories.length > 0) {
        await Product.updateMany(
          { category: { $in: newOffer.categories } },
          { $set: { offer: savedOffer._id } }
        );
      }

      return res.status(httpStatus.CREATED).json({
        success: true,
        message: 'Offer created successfully',
        offer: savedOffer
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Updates an existing offer with new configuration data.
   * Reapplies product associations based on updated offer type.
   *
   * @param {Object} req - Express request object with offer id and updated data
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} JSON response with status and updated offer details
   */
  editOffer: async (req, res, next) => {
    try {
      const {
        offer_id,
        offer_type,
        offer_percentage,
        expiry_date,
        products,
        categories,
        referral_code,
        referral_bonus
      } = req.body;

      if (!offer_type || !expiry_date) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Offer type and expiry date are required.'
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const offerExpiryDate = new Date(expiry_date);
      if (offerExpiryDate < today) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Expiry date must be today or a future date.'
        });
      }

      const percentage = parseFloat(offer_percentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Offer percentage should be a number between 0 and 100.'
        });
      }

      if (offer_type === 'referral') {
        if (!referral_code || referral_code.trim() === '') {
          return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Referral code is required for referral offers.'
          });
        }
        
        if (referral_bonus < 0) {
          return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Referral bonus cannot be negative.'
          });
        }
      }

      const existingOffer = await Offer.findById(offer_id);
      if (!existingOffer) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: 'Offer not found.'
        });
      }

      existingOffer.offer_type = offer_type;
      existingOffer.offer_percentage = percentage;
      existingOffer.expiry_date = offerExpiryDate;

      if (offer_type === 'referral') {
        existingOffer.referral_code = referral_code;
        existingOffer.referral_bonus = referral_bonus;
        existingOffer.products = undefined;
        existingOffer.categories = undefined;
      } else if (offer_type === 'product' && products) {
        existingOffer.products = Array.isArray(products) ? products : [products];
        existingOffer.categories = undefined;
        existingOffer.referral_code = undefined;
        existingOffer.referral_bonus = 0;
      } else if (offer_type === 'category' && categories) {
        existingOffer.categories = Array.isArray(categories) ? categories : [categories];
        existingOffer.products = undefined;
        existingOffer.referral_code = undefined;
        existingOffer.referral_bonus = 0;
      } else {
        existingOffer.products = undefined;
        existingOffer.categories = undefined;
        existingOffer.referral_code = undefined;
        existingOffer.referral_bonus = 0;
      }

      const updatedOffer = await existingOffer.save();

      await Product.updateMany(
        { offer: updatedOffer._id },
        { $unset: { offer: "" } }
      );

      if (offer_type === 'product' && updatedOffer.products && updatedOffer.products.length > 0) {
        await Product.updateMany(
          { _id: { $in: updatedOffer.products } },
          { $set: { offer: updatedOffer._id } }
        );
      }

      if (offer_type === 'category' && updatedOffer.categories && updatedOffer.categories.length > 0) {
        await Product.updateMany(
          { category: { $in: updatedOffer.categories } },
          { $set: { offer: updatedOffer._id } }
        );
      }

      return res.status(httpStatus.OK).json({
        success: true,
        message: 'Offer updated successfully.',
        offer: updatedOffer
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Toggles an offer's active status and updates product associations accordingly.
   * When deactivating, removes offer references from products.
   * When activating, restores offer references based on offer type.
   *
   * @param {Object} req - Express request object with offer ID and isActive status
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} JSON response with updated offer status
   */
  toggleActiveOffer: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const offer = await Offer.findByIdAndUpdate(id, { isActive: isActive }, { new: true });
      if (!offer) {
        return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "Offer not found" });
      }
      if (!isActive) {
        await Product.updateMany(
          { offer: offer._id },
          { $unset: { offer: "" } }
        );
      } else {
        if (offer.offer_type === 'product' && offer.products && offer.products.length > 0) {
          await Product.updateMany(
            { _id: { $in: offer.products } },
            { $set: { offer: offer._id } }
          );
        }
        
        if (offer.offer_type === 'category' && offer.categories && offer.categories.length > 0) {
          await Product.updateMany(
            { category: { $in: offer.categories } },
            { $set: { offer: offer._id } }
          );
        }
      }

      res.status(httpStatus.OK).json({ 
        success: true, 
        message: `Offer ${isActive ? 'activated' : 'deactivated'} successfully!`, 
        offer 
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Permanently removes an offer from the system.
   * Note: This doesn't clean up product references - consider handling that
   * in a pre-delete hook on the Offer model.
   *
   * @param {Object} req - Express request object with offer ID
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Object} JSON response confirming deletion
   */
  deleteOffer: async (req, res, next) => {
    const { id } = req.params;
    try {
      const deletedOffer = await Offer.findByIdAndDelete(id);
      if (!deletedOffer) {
        return res.status(httpStatus.NOT_FOUND).json({ success: false, message: 'Offer not found' });
      }

      // Note: Consider clearing offer references from products here
      // or implementing this in a pre-delete middleware for Offer model

      res.status(httpStatus.OK).json({
        success: true,
        message: 'Offer deleted successfully',
        deletedOffer,
      });
    } catch (err) {
      next(err);
    }
  },
}

module.exports = offerControls;