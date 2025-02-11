const bcrypt = require("bcrypt");
const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");
const tokenBlacklist = require('../../utils/tokenBlacklist');
const { validateSignup } = require("../../validators/validateSignup");
const { generateSignupEmail } = require("../../utils/emailTemplates");
const { validateOtpRequest } = require("../../validators/otpValidator");
const {createOtp} = require("../../services/otpService")
const {
  hashPassword,
  verifyPassword,
  generateToken,
} = require("../../services/authService");
const { sendEmail } = require("../../services/emailService");


const userAuth = {

  signup: async (req, res) => {
    try {
      const { first_name, last_name, email, password, confirm_password } =
        req.body;

      // Validate input
      const { isValid, errors } = validateSignup({
        first_name,
        last_name,
        email,
        password,
        confirm_password,
      });

      if (!isValid) {
        return res.status(400).json({ success: false, errors });
      }

      let user = await User.findOne({ email });

      if (user && user.isVerified) {
        return res.status(400).json({
          success: false,
          errors: { email: "User already exists with this email." },
        });
      }

      // Generate OTP and hash password
      const { otp, otpExpires } = createOtp();
      const hashedPassword = await hashPassword(password);

      console.log("OTP is:", otp);

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

      // Generate email content
      const emailContent = generateSignupEmail(first_name, otp);

      // Send OTP email
      await sendEmail(
        email,
        emailContent.subject,
        emailContent.text,
        emailContent.html
      );

      res.status(200).json({ success: true, email });
    } catch (error) {
      console.error("Signup Error:", error);
      res.status(500).json({
        success: false,
        error: "An error occurred during signup. Please try again.",
      });
    }
  },

  verifyOtp: async (req, res) => {
    try {
      const { email, otp } = req.body;

      const { isRequestValid, validationErrors } = validateOtpRequest({
        email,
        otp,
      });

      if (!isRequestValid) {
        return res
          .status(400)
          .json({ success: false, errors: validationErrors });
      }

      const user = await User.findOne({ email });

      if (!user || user.otp !== otp || user.otpExpires < new Date()) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid or expired OTP." });
      }

      await User.updateOne(
        { email },
        { $set: { isVerified: true, otp: null, otpExpires: null } }
      );

      return res
        .status(200)
        .json({ success: true, message: "OTP verified successfully." });
    } catch (error) {
      console.error("Error during OTP verification:", error);
      return res
        .status(500)
        .json({ success: false, error: "An unexpected error occurred." });
    }
  },

  resendOtp: async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found." });
      }

      const { otp: newOtp, otpExpires } = createOtp();

      user.otp = newOtp;
      user.otpExpires = otpExpires;
      await user.save();

      const emailContent = generateSignupEmail(user.first_name, newOtp);

      await sendEmail(
        email,
        emailContent.subject,
        emailContent.text,
        emailContent.html
      );

      return res.status(200).json({
        success: true,
        message: "A new OTP has been sent to your email.",
      });
    } catch (error) {
      console.error("Error during resend OTP:", error);
      return res
        .status(500)
        .json({ success: false, error: "An unexpected error occurred." });
    }
  },
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          errors: { general: "Email and password are required." },
        });
      }

      // Check if the user exists 
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          errors: { email: "User not found or not found." },
        });
      }

      // Check if the user is blocked
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          errors: {
            general: "Your account has been blocked. Please contact support.",
          },
        });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          errors: { password: "Invalid credentials." },
        });
      }

      // Generate JWT token
      const token = generateToken(user);

      // Set cookie with secure options
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 3600000, // 1 hour
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
        },
        redirect: "/home",
      });
    } catch (error) {
      console.error("Login Error:", error);
      return res.status(500).json({
        success: false,
        errors: { general: "Something went wrong. Please try again later." },
      });
    }
  },
  submitReview: async (req, res) => {
    try {
      const rating = req.params.id;
      const { productId, feedback } = req.body;

      const user = req.user;
      const userId = user.id; // Ensure this is a string (ObjectId)

      // Fetch user details correctly
      const userDetails = await User.findById(userId);

      if (!userDetails) {
        return res.status(404).send("User not found");
      }

      // Create a new review
      const review = new Review({
        rating,
        feedback,
        product: productId,
        user: userId, // Ensure this is an ObjectId
        user_name: userDetails.first_name, // Send user name
      });

      // Save the review to the database
      await review.save();

      // Redirect or send a response
      res.redirect("/product-details/" + productId);
    } catch (error) {
      console.error("Error submitting review:", error);
      res.status(500).send("Error submitting review");
    }
  },
  logout: (req, res) => {
    const token = req.cookies.authToken;
    if (token) {
      tokenBlacklist.add(token); // Add token to the blacklist
    }
    res.clearCookie("authToken"); // Clear the authToken cookie
    return res.status(200).redirect("/login");
  },
};

module.exports = userAuth;
