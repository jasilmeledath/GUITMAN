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

// Initialize application
const app = express();
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use(methodOverride("_method"));
const nocache = require("nocache");
const redirectIfLoggedIn = require("./app/middlewares/redirectIfLoggedIn");

// Connect database
connectDatabase();

// No-cache middleware
app.use(nocache());

// Set no-cache for static files in production environment
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

// app.use(redirectIfLoggedIn);

// Routes
app.get("/", loadPages.landing);

// Apply verifyUser middleware with exclusions
app.use("/", userRoutes);

// Admin routes
app.use("/admin", adminRoutes);

// 404 handler (for non-existing routes)
app.use((req, res) => {
  res.status(HttpStatus.NOT_FOUND).render("404");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);

  if (req.xhr || req.headers.accept.indexOf("json") > -1) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).render("500");
  }

  res
    .status(HttpStatus.INTERNAL_SERVER_ERROR)
    .render("500", { message: "Internal Server Error" });
});

// Start server
app.listen(process.env.PORT, () => {
  console.log(`GuitMan is live on port: ${process.env.PORT}`);
});
