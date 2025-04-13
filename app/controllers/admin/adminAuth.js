/**
 * Admin Authentication Controller
 * Handles admin login, logout, and authentication processes
 * 
 * @module controllers/adminAuth
 */

const jwt = require("jsonwebtoken");
const Admin = require("../../models/adminModel");
const bcrypt = require("bcrypt");
const tokenBlacklist = require("../../utils/tokenBlacklist");
const { adminErrors } = require("../../utils/messages");
const HttpStatus = require("../../utils/httpStatus");

const adminAuth = {
  /**
   * Handles admin login authentication
   *
   * @param {Object} req - Express request object containing email and password
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .render("backend/adminLogin", {
            error: adminErrors.login.adminNotFound,
          });
      }
      
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .render("backend/adminLogin", {
            error: adminErrors.login.invalidCredentials,
          });
      }
      
      const token = jwt.sign(
        { id: admin._id, email: admin.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000,
      });
      
      res.redirect(`/admin/dashboard`);
    } catch (err) {
      next(err);
    }
  },
  
  /**
   * Handles admin logout process
   *
   * @param {Object} req - Express request object containing auth token in cookies
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  logout: (req, res, next) => {
    try {
      const token = req.cookies.authToken;
      
      if (token) {
        tokenBlacklist.add(token);
      }
      
      res.clearCookie("authToken");
      
      return res.status(HttpStatus.OK).redirect("/admin/login");
    } catch (err) {
      next(err);
    }
  },
};

module.exports = adminAuth;