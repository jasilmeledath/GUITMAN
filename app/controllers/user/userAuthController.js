const User = require("../../models/userModel");
const bcrypt = require('bcrypt');
const tokenBlacklist = require('../../utils/tokenBlacklist');
const { validateSignup } = require("../../validators/validateSignup");
const { generateSignupEmail,generateForgotPasswordEmail } = require("../../utils/emailTemplates");
const { validateOtpRequest } = require("../../validators/otpValidator");
const {createOtp} = require("../../services/otpService")
const {
  hashPassword,
  verifyPassword,
  generateToken,
} = require("../../services/authService");
const { sendEmail } = require("../../services/emailService");
const httpStatus = require("../../utils/httpStatus");
const {userErrors, userSuccess}= require("../../utils/messages");
const createWallet = require('../../helpers/createWallet');

const userAuth = {

  signup: async (req, res, next) => {
    try {
      const { first_name, last_name, email, password, confirm_password } =
        req.body;

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

      const emailContent = generateSignupEmail(first_name, otp);

      await sendEmail(
        email,
        emailContent.subject,
        emailContent.text,
        emailContent.html
      );

      req.user = user
      await createWallet(req,res,next);

      
     return res.status(httpStatus.OK).json({ success: true, email });
    } catch (err) {
      next(err);
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
          .status(httpStatus.BAD_REQUEST)
          .json({ success: false, errors: validationErrors });
      }

      const user = await User.findOne({ email });

      if (!user || user.otp !== otp || user.otpExpires < new Date()) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ success: false, error: userErrors.registration.otpMismatch });
      }

      await User.updateOne(
        { email },
        { $set: { isVerified: true, otp: null, otpExpires: null } }
      );

      return res
        .status(httpStatus.OK)
        .json({ success: true, message: userSuccess.registration.otpVerified});
      } catch (err) {
        next(err);
      }
  },

  resendOtp: async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: userErrors.login.userNotFound});
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
        message: userSuccess.registration.otpResent,
      });
    } catch (err) {
      next(err);
    }
  },
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          errors: { general: userErrors.general.missingCredentials},
        });
      }

      // Check if the user exists 
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          errors: { email: userErrors.login.userNotFound },
        });
      }

      // Check if the user is blocked
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          errors: {
            general: userErrors.profile.unauthorized,
          },
        });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          errors: { password: userErrors.login.invalidCredentials },
        });
      }

      // Generate JWT token
      const token = generateToken(user);

      // Set cookie with secure options
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
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
  sendOtpToResetPassword: async(req,res,next)=>{
    try {
      const {email} = req.body;
      const isExistingUser = await User.findOne({email:email});
      if(!isExistingUser){
        return res.status(httpStatus.NOT_FOUND)
        .json({success: false, message:"User with this email does not exists !"});
      }
      const { otp, otpExpires } = createOtp();
      isExistingUser.otp = otp;
      isExistingUser.otpExpires = otpExpires;
      await isExistingUser.save();
      console.log('OTP is:', otp);

      const emailContent = generateForgotPasswordEmail(isExistingUser.first_name, otp);
      await sendEmail(
        email,
        emailContent.subject,
        emailContent.text,
        emailContent.html
      );
      res.status(httpStatus.OK)
      .json({success: true, message:"Otp send successfully!"})
    } catch (err) {
      next(err)
    }
  },
  verifOtpToResetPassword : async(req,res,next)=>{
    try {
      const{email, otp} = req.body;
      const user = await User.findOne({email: email});
      if (!user || user.otp !== otp || user.otpExpires < new Date()) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ success: false, error: userErrors.registration.otpMismatch });
      }
      await User.updateOne(
        { email },
        { $set: { isVerified: true, otp: null, otpExpires: null } }
      );
      return res
        .status(httpStatus.OK)
        .json({ success: true, message: "Security verification completed!"});
    } catch (err) {
      next(err);
    }
  },
  resetPassword: async(req,res,next)=>{
    try {      
      const {email, password} = req.body;
      const user = await User.findOne({email});
      const isExistingPassword = await bcrypt.compare(password, user.password);
      if(isExistingPassword){
        return res.status(httpStatus.BAD_REQUEST)
        .json({success:false, message:"Please choose a new password that you haven't used before."})
      }
      const hashedPassword = await hashPassword(password);
      await User.updateOne(
        { email },
        { $set: { password: hashedPassword } }
      );
      res.status(httpStatus.OK)
      .json({success: true, message:"Password Reset Successfull"})
    } catch (err) {
      next(err)
    }
  },
  logout: (req, res) => {
    try{
      const token = req.cookies.authToken;
    if (token) {
      tokenBlacklist.add(token); 
    }
    res.clearCookie('authToken', { path: '/' });
    return res.status(httpStatus.OK).redirect("/login");
    }catch(err){
      next(err);
    }
  },
};

module.exports = userAuth;
