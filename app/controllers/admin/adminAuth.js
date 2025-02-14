const jwt = require("jsonwebtoken");
const Admin = require("../../models/adminModel");
const bcrypt = require("bcrypt");
const tokenBlacklist = require("../../utils/tokenBlacklist");
const { adminErrors } = require("../../utils/messages");
const HttpStatus = require("../../utils/httpStatus");

const adminAuth = {
  /**
   * Handles admin login authentication.
   * - Checks if the admin exists in the database.
   * - Validates the provided password using bcrypt.
   * - Generates a JWT token upon successful authentication.
   * - Stores the token in an HTTP-only cookie for security.
   * - Redirects the admin to the dashboard on success.
   * 
   * @param {Object} req - Express request object (contains email and password).
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next function to handle errors.
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Check if the admin exists in the database
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .render("backend/adminLogin", {
            error: adminErrors.login.adminNotFound, 
          });
      }

      // Compare the provided password with the stored hash
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .render("backend/adminLogin", {
            error: adminErrors.login.invalidCredentials, // Display invalid credentials error
          });
      }

      // Generate a JWT token for authentication
      const token = jwt.sign(
        { id: admin._id, email: admin.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" } // Token expires in 1 hour
      );

      // Store the JWT token in a secure HTTP-only cookie
      res.cookie("authToken", token, {
        httpOnly: true, // Prevents JavaScript access (mitigates XSS attacks)
        secure: process.env.NODE_ENV === "production", // Enables secure cookies in production
        maxAge: 3600000, // Cookie expires in 1 hour
      });

      // Redirect the admin to the dashboard after successful login
      res.redirect(`/admin/dashboard`);
    } catch (err) {
      next(err); // Pass error to global error handler middleware
    }
  },

  /**
   * Handles admin logout.
   * - Adds the current authentication token to a blacklist to prevent reuse.
   * - Clears the authentication cookie from the client.
   * - Redirects the admin to the login page after logout.
   * 
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next function to handle errors.
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