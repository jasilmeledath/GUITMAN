const jwt = require("jsonwebtoken");
const Admin = require("../../models/adminModel");
const bcrypt = require("bcrypt");
const tokenBlacklist = require("../../utils/tokenBlacklist");
const Category = require("../../models/categoryModel");
const { adminErrors } = require("../../utils/errorMessages");
const HttpStatus = require("../../utils/httpStatus");

const adminAuth = {
  loadLogin: (req, res) => {
    res.render("backend/adminLogin");
  },
  login: async (req, res) => {
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
      // Generate JWT token
      const token = jwt.sign(
        { id: admin._id, email: admin.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000, // 1 hour
      });
      res.redirect(`/admin/dashboard`);
    } catch (err) {
      console.error(err);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .render("backend/adminLogin", {
          error: adminErrors.general.serverError,
        });
    }
  },
  loadDashboard: async (req, res) => {
    try {
      const categories = await Category.find({});
      res.render("backend/dashboard");
    } catch (error) {
      console.error("Error loading dashboard:", error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Unable to load dashboard.");
    }
  },
  addAdmin: async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(400).send("Admin with this email already exists.");
      }

      // Hash the password
      const saltRounds = 10; // Number of salt rounds for bcrypt
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create a new admin with hashed password
      const admin = new Admin({
        name,
        email,
        password: hashedPassword,
      });

      await admin.save();

      res.send("Admin added successfully.");
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error.");
    }
  },
  logout: (req, res) => {
    const token = req.cookies.authToken;
    if (token) {
      tokenBlacklist.add(token); // Add token to the blacklist
    }
    res.clearCookie("authToken"); // Clear the authToken cookie
    return res.status(200).redirect("/admin/login");
  },
};
module.exports = adminAuth;
