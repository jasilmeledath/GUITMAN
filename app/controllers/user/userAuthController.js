const User = require("../../models/userModel");
const bcrypt = require('bcrypt');
const tokenBlacklist = require('../../utils/tokenBlacklist');
const { validateSignup } = require("../../validators/validateSignup");
const { generateSignupEmail, generateForgotPasswordEmail } = require("../../utils/emailTemplates");
const { validateOtpRequest } = require("../../validators/otpValidator");
const { createOtp } = require("../../services/otpService");
const {
  hashPassword,
  verifyPassword,
  generateToken,
} = require("../../services/authService");
const { sendEmail } = require("../../services/emailService");
const httpStatus = require("../../utils/httpStatus");
const { userErrors, userSuccess } = require("../../utils/messages");
const createWallet = require('../../helpers/createWallet');

const userAuth = {
  /**
   * Handles user signup by validating input, creating or updating a user,
   * generating an OTP for email verification, sending a signup email,
   * and creating a wallet for the user.
   *
   * @param {Object} req - Express request object containing signup details in req.body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  signup: async (req, res, next) => {
    try {
      const { first_name, last_name, email, password, confirm_password } = req.body;

      const { isValid, errors } = validateSignup({
        first_name,
        last_name,
        email,
        password,
        confirm_password,
      });

      if (!isValid) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, errors });
      }

      let user = await User.findOne({ email });

      if (user && user.isVerified) {
        return res.status(httpStatus.CONFLICT).json({
          success: false,
          errors: { email: userErrors.login.alreadyExisting },
        });
      }

      // Generate OTP and hash the password.
      const { otp, otpExpires } = createOtp();
      const hashedPassword = await hashPassword(password);
      
      if (!user) {
        user = new User({
          first_name,
          last_name,
          email,
          password: hashedPassword,
          otp,
          otpExpires,
        });
      } else {
        user.password = hashedPassword;
        user.otp = otp;
        user.otpExpires = otpExpires;
      }

      await user.save();

      const emailContent = generateSignupEmail(first_name, otp);
      await sendEmail(email, emailContent.subject, emailContent.text, emailContent.html);
      req.user = user;
      await createWallet(req, res, next);
      return res.status(httpStatus.OK).json({ success: true, email });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Verifies the OTP provided during signup.
   *
   * @param {Object} req - Express request object with email and otp in the body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  verifyOtp: async (req, res, next) => {
    try {
      const { email, otp } = req.body;

      const { isRequestValid, validationErrors } = validateOtpRequest({ email, otp });
      if (!isRequestValid) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, errors: validationErrors });
      }

      const user = await User.findOne({ email });
      if (!user || user.otp !== otp || user.otpExpires < new Date()) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          error: userErrors.registration.otpMismatch,
        });
      }

      await User.updateOne({ email }, { $set: { isVerified: true, otp: null, otpExpires: null } });
      return res.status(httpStatus.OK).json({ success: true, message: userSuccess.registration.otpVerified });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Resends the OTP to the user's email for signup verification.
   *
   * @param {Object} req - Express request object containing the email in the body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  resendOtp: async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, error: userErrors.login.userNotFound });
      }

      const { otp: newOtp, otpExpires } = createOtp();
      user.otp = newOtp;
      user.otpExpires = otpExpires;
      await user.save();

      const emailContent = generateSignupEmail(user.first_name, newOtp);
      await sendEmail(email, emailContent.subject, emailContent.text, emailContent.html);

      return res.status(200).json({ success: true, message: userSuccess.registration.otpResent });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Handles user login by validating credentials, checking if the user is active,
   * generating a JWT, and setting it in an HTTP-only cookie.
   *
   * @param {Object} req - Express request object containing email and password in the body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          errors: { general: userErrors.general.missingCredentials },
        });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          errors: { email: userErrors.login.userNotFound },
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          errors: { general: userErrors.profile.unauthorized },
        });
      }

      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          errors: { password: userErrors.login.invalidCredentials },
        });
      }

      const token = generateToken(user);
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.status(200).json({
        success: true,
        message: userSuccess.login.loginSuccess,
        user: {
          id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
        },
        redirect: "/home",
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Sends an OTP to the user's email for password reset.
   *
   * @param {Object} req - Express request object containing email in the body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  sendOtpToResetPassword: async (req, res, next) => {
    try {
      const { email } = req.body;
      const isExistingUser = await User.findOne({ email });
      if (!isExistingUser) {
        return res.status(httpStatus.NOT_FOUND)
          .json({ success: false, message: "User with this email does not exist!" });
      }
      const { otp, otpExpires } = createOtp();
      isExistingUser.otp = otp;
      isExistingUser.otpExpires = otpExpires;
      await isExistingUser.save();

      console.log('OTP is:', otp); // (Remove in production)
      const emailContent = generateForgotPasswordEmail(isExistingUser.first_name, otp);
      await sendEmail(email, emailContent.subject, emailContent.text, emailContent.html);

      res.status(httpStatus.OK).json({ success: true, message: "OTP sent successfully!" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Verifies the OTP during the password reset process.
   *
   * @param {Object} req - Express request object containing email and otp in the body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  verifOtpToResetPassword: async (req, res, next) => {
    try {
      const { email, otp } = req.body;
      const user = await User.findOne({ email });
      if (!user || user.otp !== otp || user.otpExpires < new Date()) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          error: userErrors.registration.otpMismatch,
        });
      }
      await User.updateOne({ email }, { $set: { isVerified: true, otp: null, otpExpires: null } });
      return res.status(httpStatus.OK).json({ success: true, message: "Security verification completed!" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Resets the user's password after verifying that the new password is different.
   *
   * @param {Object} req - Express request object containing email and new password in the body.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  resetPassword: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      const isExistingPassword = await bcrypt.compare(password, user.password);
      if (isExistingPassword) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Please choose a new password that you haven't used before."
        });
      }
      const hashedPassword = await hashPassword(password);
      await User.updateOne({ email }, { $set: { password: hashedPassword } });
      res.status(httpStatus.OK).json({ success: true, message: "Password reset successful" });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Logs out the user by blacklisting the token and clearing the cookie.
   *
   * @param {Object} req - Express request object containing the auth token cookie.
   * @param {Object} res - Express response object.
   */
  logout: (req, res, next) => {
    try {
      const token = req.cookies.authToken;
      if (token) {
        tokenBlacklist.add(token);
      }
      res.clearCookie('authToken', { path: '/' });
      return res.status(httpStatus.OK).redirect("/login");
    } catch (err) {
      next(err);
    }
  },
};

module.exports = userAuth;
