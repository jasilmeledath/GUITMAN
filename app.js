/**
 * Main application entry point for GuitMan e-commerce platform
 * This file initializes Express server and configures middleware,
 * routes, error handling, and database connection
 */

// Load environment variables
const dotenv = require("dotenv");
dotenv.config();

// Core dependencies
const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const jwt = require('jsonwebtoken');
const nocache = require("nocache");

// Application routes and utilities
const userRoutes = require("./app/routes/user/userRoutes");
const adminRoutes = require("./app/routes/admin/adminRoutes");
const connectDatabase = require("./app/config/database");
const { redirectIfAdminLoggedIn } = require("./app/middlewares/redirectIfLoggedIn");
const { status } = require("http-status");
const { generalLimiter } = require("./app/middlewares/rateLimiter");
const User = require('./app/models/userModel');
const Admin = require('./app/models/adminModel');

// Initialize Express application
const app = express();
app.set("view engine", "ejs");

/**
 * Middleware Configuration
 * Sets up request parsing, static file serving, and session management
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use(methodOverride("_method"));
app.use(nocache());

// Session configuration
app.use(session({
  secret: 'your_secret_key', // TODO: Move to environment variable in production
  resave: false,
  saveUninitialized: true
}));

// Ensure upload directory structure exists
const uploadDir = path.join(__dirname, "public/uploads/products");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Initialize database connection
connectDatabase();

/**
 * Security Headers
 * Prevent caching for authenticated content to mitigate certain security risks
 */
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

// Authentication middleware
app.use(redirectIfAdminLoggedIn);

// Rate limiting - uncomment in production to prevent abuse
// app.use(generalLimiter);

/**
 * Route Registration
 * Mount the main application routes
 */
app.use("/", userRoutes);
app.use("/admin", adminRoutes);

/**
 * 404 Handler
 * Custom handling for routes that don't exist
 */
app.use(async (req, res) => {
  try {
    const token = req.cookies.authToken;
    let user = null;
    let admin = null;

    // Verify authentication state for contextual 404 page
    if (token) {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const id = decodedToken.id;

      user = await User.findById(id) || null;
      admin = await Admin.findById(id) || null;
    }

    res.status(status.NOT_FOUND).render("404", { user, admin });
  } catch (error) {
    console.error("Error in 404 handler:", error.message);
    res.status(status.NOT_FOUND).render("404", { user: null, admin: null });
  }
});

/**
 * Global Error Handler
 * Centralized error processing for uncaught exceptions
 */
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);

  // Handle file upload size errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(status.BAD_REQUEST).render("500", {
      message: "File too large. Please upload smaller files.",
    });
  }

  // Format response based on request type (JSON for API calls)
  if (req.xhr || req.headers.accept.indexOf("json") > -1) {
    return res.status(status.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
  }

  // Render error page for standard requests
  res.status(status.INTERNAL_SERVER_ERROR).render("500", { message: "Internal Server Error" });
});

/**
 * Server Initialization
 * Start the HTTP server on the configured port
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  const environment = process.env.NODE_ENV || 'development';
  
  // Server startup log is commented out in production
  // but kept for reference during development
});

// Alternative configuration for specific network interface
// const PORT = process.env.PORT || 8080;
// app.listen(PORT, '172.20.10.4', () => {
//   console.log(`GuitMan is live on http://172.20.10.4:${PORT}`);
// });