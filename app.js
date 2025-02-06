const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const userRoutes = require("./app/routes/user/userRoutes");
const adminRoutes = require("./app/routes/admin/adminRoutes");
const connectDatabase = require("./app/config/database");
const cookieParser = require("cookie-parser");
const loadPages = require("./app/controllers/user/loadPages");
const HttpStatus = require("./app/utils/httpStatus");
const fs = require("fs");
const jwt = require('jsonwebtoken');
const{redirectIfAdminLoggedIn} = require("./app/middlewares/redirectIfLoggedIn");
const User = require('./app/models/userModel');
const Admin = require('./app/models/adminModel');


// Initialize application
const app = express();
app.set("view engine", "ejs");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cookieParser());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use(methodOverride("_method"));
const nocache = require("nocache");


// Ensure upload directory exists
const uploadDir = path.join(__dirname, "public/uploads/products");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Connect database
connectDatabase();

// No-cache middleware
app.use(nocache());

// Set no-cache for static files in production environment
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

app.use(redirectIfAdminLoggedIn);
// Routes

// Apply verifyUser middleware with exclusions
app.use("/", userRoutes);

// Admin routes
app.use("/admin", adminRoutes);

// 404 handler (for non-existing routes)
app.use(async (req, res) => {
  try {
    const token = req.cookies.authToken;
    let user = null;
    let admin = null;

    if (token) {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const id = decodedToken.id;

      user = await User.findById(id) || null;
      admin = await Admin.findById(id) || null;
    }

    res.status(HttpStatus.NOT_FOUND).render("404", { user, admin });
  } catch (error) {
    console.error("Error in 404 handler:", error.message);
    res.status(HttpStatus.NOT_FOUND).render("404", { user: null, admin: null });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(HttpStatus.BAD_REQUEST).render("500", {
      message: "File too large. Please upload smaller files.",
    });
  }

  if (req.xhr || req.headers.accept.indexOf("json") > -1) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).render("500");
  }

  res
    .status(HttpStatus.INTERNAL_SERVER_ERROR)
    .render("500", { message: "Internal Server Error" });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`GuitMan is live on port: ${PORT}`);
});