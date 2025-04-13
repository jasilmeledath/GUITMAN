const User = require('../../models/userModel');
const getUser = require('../../helpers/getUser');
const httpStatus = require('../../utils/httpStatus');
const { hashPassword, verifyPassword } = require('../../services/authService');
const { createOtp } = require('../../services/otpService');
const { generateUpdatedEmailOtp } = require('../../utils/emailTemplates');
const { sendEmail } = require('../../services/emailService');
const Address = require('../../models/addressModel');
const DebitCard = require('../../models/debitCardModel');
const Wishlist = require('../../models/wishlistModel');

/**
 * Profile Controller Module
 * Handles user profile related operations including updating profile image, user information,
 * password changes, email verification via OTP, address management, card management and wishlist operations.
 *
 * @module controllers/profileControls
 */
const profileControls = {

  /**
   * Updates the user's profile image.
   *
   * @param {Object} req - Express request object containing the uploaded file.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response containing the new profile image URL.
   */
  updateProfileImage: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
      }

      const user = await getUser(req, res, next);
      const userId = user._id;
      const profileImagePath = `/uploads/profile-images/${req.file.filename}`;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { profile_image: profileImagePath },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(httpStatus.NOT_FOUND).json({ message: 'User not found' });
      }
      res.status(httpStatus.OK).json({ profile_image_url: profileImagePath });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Updates the user's basic information.
   *
   * @param {Object} req - Express request object containing first name, last name, and mobile.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response indicating success or failure.
   */
  updateUserInfo: async (req, res, next) => {
    try {
      const { first_name, last_name, mobile } = req.body;
      const user = await getUser(req, res, next);
      const userId = user._id;

      if (!first_name || !last_name || !mobile) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "No changes made" });
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId, {
          first_name: first_name,
          last_name: last_name,
          mobile: mobile
        }
      );

      if (!updatedUser) {
        return res.status(httpStatus.NOT_FOUND)
          .json({ message: "Something went wrong!" });
      }
      res.status(httpStatus.OK).json({ message: "Changes saved" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Updates the user's password.
   *
   * @param {Object} req - Express request object containing current and new password fields.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response indicating success or failure of the password update.
   */
  updatePassword: async (req, res, next) => {
    try {
      const { current_password, new_password, confirm_password } = req.body;
      const user = await getUser(req, res, next);
      const userId = user._id;

      if (new_password !== confirm_password) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Passwords do not match!" });
      }

      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!strongPasswordRegex.test(new_password)) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "New password does not meet strength requirements!" });
      }

      const hashedPassword = await hashPassword(new_password);

      if (!current_password) {
        // When there is no existing password (e.g. first time setup)
        const updatedUser = await User.findByIdAndUpdate(userId, { password: hashedPassword });
        if (!updatedUser) {
          return res.status(httpStatus.NOT_FOUND).json({ message: "Something went wrong" });
        }
        return res.status(httpStatus.OK).json({ message: "Password added successfully" });
      }

      const isOldPassword = await verifyPassword(new_password, user.password);
      if (isOldPassword) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "New password should not match the old password" });
      }

      const isCurrentPassword = await verifyPassword(current_password, user.password);
      if (!isCurrentPassword) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid Current Password!" });
      }

      const updatedUser = await User.findByIdAndUpdate(userId, { password: hashedPassword });
      if (!updatedUser) {
        return res.status(httpStatus.NOT_FOUND).json({ message: "Something went wrong" });
      }
      res.status(httpStatus.OK).json({ message: "Password updated successfully" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Sends an OTP to the new email address after verifying the current password.
   *
   * @param {Object} req - Express request object containing current password, new email, and confirm email.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response indicating the status of the OTP send operation.
   */
  sendOtp: async (req, res, next) => {
    try {
      const { current_password, new_email, confirm_email } = req.body;
      const user = await getUser(req, res, next);
      const userId = user._id;

      const isVerified = await verifyPassword(current_password, user.password);
      if (!isVerified) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid Password" });
      }

      if (new_email !== confirm_email) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Emails do not match!" });
      }

      const { otp, otpExpires } = await createOtp();
      const updatedUser = await User.findByIdAndUpdate(userId, { otp: otp, otpExpires: otpExpires });

      if (!updatedUser) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong" });
      }

      const emailContent = generateUpdatedEmailOtp(user.first_name, otp);
      await sendEmail(
        new_email,
        emailContent.subject,
        emailContent.text,
        emailContent.html
      );
      res.status(httpStatus.OK).json({ message: "OTP sent to your email!" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Resends the OTP to the specified email address.
   *
   * @param {Object} req - Express request object containing the target email.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response indicating success or failure of the resend operation.
   */
  resendOtp: async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(httpStatus.BAD_GATEWAY).json({ message: "Something went wrong!" });
      }

      const user = await getUser(req, res, next);
      const userId = user._id;

      const { otp, otpExpires } = await createOtp();
      const updatedUser = await User.findByIdAndUpdate(userId, { otp: otp, otpExpires: otpExpires });

      if (!updatedUser) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong" });
      }

      const emailContent = generateUpdatedEmailOtp(user.first_name, otp);
      await sendEmail(
        email,
        emailContent.subject,
        emailContent.text,
        emailContent.html
      );
      res.status(httpStatus.OK).json({ message: "OTP sent to your email!" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Verifies the OTP and updates the user's email address.
   *
   * @param {Object} req - Express request object containing new email and OTP.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response indicating whether the email update was successful.
   */
  verifyAndUpdateEmail: async (req, res, next) => {
    try {
      const { new_email, otp } = req.body;

      if (!new_email) {
        return res.status(httpStatus.BAD_GATEWAY).json({ message: "Something went wrong!" });
      }

      const user = await getUser(req, res, next);
      const userId = user._id;

      if (!user || user.otp !== otp || user.otpExpires < new Date()) {
        return res
          .status(httpStatus.BAD_GATEWAY)
          .json({ message: "Invalid OTP!" });
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { email: new_email, otp: null, otpExpires: null }
      );
      if (!updatedUser) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong!" });
      }

      res.status(httpStatus.OK).json({ message: "Email updated successfully" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Adds a new address for the user.
   *
   * @param {Object} req - Express request object containing address fields.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response with the added address data.
   */
  addAddress: async (req, res, next) => {
    try {
      const {
        name,
        email,
        contact_number,
        alternate_number,
        country,
        state,
        address,
        pincode,
        landmark,
        address_type,
      } = req.body;

      if (!name || !email || !contact_number || !country || !state || !address || !pincode || !address_type) {
        return res.status(httpStatus.BAD_REQUEST).json({
          message: "Missing required fields. Please provide name, email, contact number, country, state, address, pincode, and address type."
        });
      }
      const user = await getUser(req, res, next);

      // Create a new address document for the user.
      const newAddress = new Address({
        user,
        full_name: name,
        email,
        contact_number,
        alternate_number: alternate_number || null,
        country,
        state,
        address,
        pincode,
        landmark: landmark || null,
        address_type,
      });

      const savedAddress = await newAddress.save();
      res.status(httpStatus.OK).json({
        success: true,
        message: "Address added successfully!",
        address: savedAddress,
      });
    } catch (err) {
      if (err.name === "ValidationError") {
        return res.status(httpStatus.BAD_REQUEST).json({
          message: "Validation Error",
          details: err.errors,
        });
      }
      next(err);
    }
  },

  /**
   * Updates an existing address for the user.
   *
   * @param {Object} req - Express request object containing updated address details and its ID.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response indicating success or failure of the update.
   */
  updateAddress: async (req, res, next) => {
    try {
      const {
        name,
        email,
        contact_number,
        alternate_number,
        country,
        state,
        address,
        pincode,
        landmark,
        address_type,
        id
      } = req.body;

      if (!id) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong" });
      }
      if (!name || !email || !contact_number || !country || !state || !address || !pincode || !address_type) {
        return res.status(httpStatus.BAD_REQUEST).json({
          message: "Missing required fields. Please provide name, email, contact number, country, state, address, pincode, and address type."
        });
      }

      const updatedAddress = await Address.findByIdAndUpdate(id, {
        full_name: name,
        email: email,
        contact_number: contact_number,
        alternate_number: alternate_number || null,
        country: country,
        state: state,
        address: address,
        pincode: pincode,
        landmark: landmark || null,
        address_type: address_type
      });

      if (!updatedAddress) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: "Something went wrong. Please try again later!" });
      }
      res.status(httpStatus.OK).json({ success: true, message: "Address updated successfully" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Deletes an address by its ID.
   *
   * @param {Object} req - Express request object containing the address ID.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response indicating the deletion status.
   */
  deleteAddress: async (req, res, next) => {
    try {
      const { addressId } = req.body;
      const deletedAddress = await Address.findByIdAndDelete(addressId);
      if (!deletedAddress) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Something went wrong!" });
      }
      res.status(httpStatus.OK).json({ success: true, message: "Address deleted successfully" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Adds a debit card for the user.
   *
   * @param {Object} req - Express request object containing card details.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response indicating whether the card was added successfully.
   */
  addCard: async (req, res, next) => {
    try {
      const { cardNumber, cardHolder, expiry, cardType, last4 } = req.body;
      if (!cardNumber || !cardHolder || !expiry || !cardType || !last4) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Missing card credentials. Please fill all the fields!" });
      }
      const user = await getUser(req, res, next);
      const userId = user._id;

      const debitCard = new DebitCard({
        cardHolder,
        cardNumber,
        expiry,
        cardType,
        last4,
        user: userId,
      });
      await debitCard.save();
      res.status(httpStatus.OK).json({ success: true, message: "Debit card added!" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Toggles a product in the user's wishlist. If the product exists it is removed; otherwise, it is added.
   *
   * @param {Object} req - Express request object containing productId in body or query.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response with updated wishlist details.
   */
  toggleWishList: async (req, res, next) => {
    try {
      const { productId } = req.body || req.query;

      if (!productId) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Product ID is required.'
        });
      }

      const user = await getUser(req, res, next);
      const userId = user._id;

      let wishlist = await Wishlist.findOne({ user: userId });
      if (!wishlist) {
        wishlist = new Wishlist({
          user: userId,
          items: []
        });
      }

      const productExists = wishlist.items.some(
        item => item.product.toString() === productId
      );

      if (productExists) {
        const updatedWishlist = await Wishlist.findOneAndUpdate(
          { user: userId },
          { $pull: { items: { product: productId } } },
          { new: true }
        ).populate('items.product');

        if (!updatedWishlist) {
          return res.status(httpStatus.NOT_FOUND)
            .json({ success: false, message: 'Wishlist not found' });
        }
        return res.status(httpStatus.OK).json({
          success: true,
          message: "Item removed from wishlist!",
          updatedWishlist
        });
      }

      wishlist.items.push({ product: productId });
      await wishlist.save();

      const populatedWishlist = await Wishlist.findOne({ user: userId }).populate('items.product');
      return res.status(httpStatus.OK).json({
        success: true,
        message: "Product added to wishlist!",
        wishlist: populatedWishlist
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Removes a product from the user's wishlist.
   *
   * @param {Object} req - Express request object containing productId in query parameters.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {void} JSON response indicating whether the removal was successful.
   */
  removeFromWishlist: async (req, res, next) => {
    try {
      const { productId } = req.query;
      if (!productId) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: 'Product ID is required.' });
      }

      const user = await getUser(req, res, next);
      const userId = user._id;
      if (!userId) {
        return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: 'User not authenticated.' });
      }

      const wishlist = await Wishlist.findOne({ user: userId });
      if (!wishlist) {
        return res.status(httpStatus.NOT_FOUND).json({ success: false, message: 'Wishlist not found.' });
      }

      const originalCount = wishlist.items.length;
      wishlist.items = wishlist.items.filter(item => item.product.toString() !== productId);

      if (wishlist.items.length === originalCount) {
        return res.status(httpStatus.NOT_FOUND).json({ success: false, message: 'Product not found in wishlist.' });
      }

      await wishlist.save();
      res.status(httpStatus.OK).json({ success: true, message: 'Product removed from wishlist.' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = profileControls;
