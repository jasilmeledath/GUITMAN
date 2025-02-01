const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/userModel");
const nodemailer = require("nodemailer");
const generateOTP = require("../../services/generateOtp");
const Review = require("../../models/reviewModel");
const { validateSignup } = require("../../validators/validateSignup");
const { generateSignupEmail } = require("../../utils/emailTemplates");
const {validateOtpRequest} = require("../../validators/otpValidator");


const userControls = {
  signup: async (req, res) => {
    try {
      const { first_name, last_name, email, password, confirm_password } = req.body;
  
      // Validate input
      const { isValid, errors } = validateSignup({ first_name, last_name, email, password, confirm_password });
  
      if (!isValid) {
        return res.status(400).json({ success: false, errors });
      }
  
      // Check if user already exists
      const existingUser = await User.findOne({ email });
  
      if (existingUser && existingUser.isVerified) {
        return res.status(400).json({ success: false, errors: { email: "User already exists with this email." } });
      } else if (existingUser && !existingUser.isVerified) {
        return res.status(200).json({ success: true });
      }
  
      // Generate OTP and hash password
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 60000);
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Save user
      const user = new User({
        first_name,
        last_name,
        email,
        password: hashedPassword,
        otp,
        otpExpires,
      });
  
      await user.save();
  
      // **Define transporter**
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.APP_PASS,
        },
      });
  
      // **Generate email content**
      const emailContent = generateSignupEmail(first_name, otp);
  
      // Send OTP email
      await transporter.sendMail({
        from: `GuitMan <${process.env.EMAIL}>`,
        to: email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
  
      res.status(200).json({ success: true, email });
    } catch (error) {
      console.error("Signup Error:", error);
      res.status(500).json({ success: false, error: "An error occurred during signup. Please try again." });
    }
  },

  verifyOtp: async (req, res) => {
    try {
      const { email, otp } = req.body;
  
      // Validate input
      const { isRequestValid, validationErrors } = validateOtpRequest({ email, otp });

  
      if (!isRequestValid) {
        return res.status(400).json({ success: false, errors: validationErrors });
      }
  
      // Find the user by email
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found." });
      }
  
      // Check if OTP is valid and not expired
      const isOtpExpired = user.otpExpires < new Date();
      
      if (user.otp !== otp || isOtpExpired) {
        return res.status(400).json({ success: false, error: "Invalid or expired OTP." });
      }
  
      // Mark user as verified and clear OTP fields
      await User.updateOne(
        { email },
        { $set: { isVerified: true, otp: null, otpExpires: null } }
      );
  
      return res.status(200).json({ success: true, message: "OTP verified successfully." });
    } catch (error) {
      console.error("Error during OTP verification:", error);
      return res.status(500).json({ success: false, error: "An unexpected error occurred." });
    }
  },
  resendOtp: async (req, res) => {
    try {
      const { email } = req.body;

      // Check if the email is provided
      if (!email) {
        return res
          .status(400)
          .json({ success: false, error: "Email is required." });
      }

      // Find the user by email
      const user = await User.findOne({ email });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found." });
      }

      // Generate a new OTP
      const newOtp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

      // Update user's OTP and expiration in the database
      user.otp = newOtp;
      user.otpExpires = otpExpires;
      await user.save();

      // Set up nodemailer
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.APP_PASS,
        },
      });

      // Email options
      const mailOptions = {
        from: `GuitMan <${process.env.EMAIL}>`,
        to: email,
        subject: "Resend OTP - GuitMan Email Verification",
        text: `Hello ${user.first_name},\n\nYour new OTP code is ${newOtp}. This code is valid for 10 minutes.\n\nThank you for choosing GuitMan!\n\nBest regards,\nThe GuitMan Team`,
      };

      // Send the email
      await transporter.sendMail(mailOptions);

      return res.status(200).json({
        success: true,
        message: "A new OTP has been sent to your email.",
      });
    } catch (error) {
      console.error("Error during resend OTP:", error);
      return res.status(500).json({
        success: false,
        error: "An unexpected error occurred. Please try again later.",
      });
    }
  },
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Check if the user exists and is verified
      const user = await User.findOne({ email: email, isVerified: true });
      if (!user) {
        return res.status(400).json({
          errors: { email: "User not found." },
        });
      }
  
      // Check if the user is blocked
      if (!user.isActive) {
        return res.status(403).json({
          errors: { general: "Your account has been blocked. Please contact support." },
        });
      }
  
      // Check if the password is correct
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          errors: { password: "Invalid credentials." },
        });
      }
  
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
  
      // Set the cookie
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000, // 1 hour
      });
      return res
        .status(200)
        .json({ message: "Login successful", redirect: "/home" });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({
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
            return res.status(404).send('User not found');
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
        res.redirect('/product-details/' + productId);
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).send('Error submitting review');
    }
},
logout : (req, res) => {
  const token = req.cookies.authToken;
  if (token) {
    tokenBlacklist.add(token); // Add token to the blacklist
  }
  res.clearCookie('authToken'); // Clear the authToken cookie
  return res.status(200).redirect('/admin/login');
},
};

module.exports = userControls;
