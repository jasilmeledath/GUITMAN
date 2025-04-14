const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const jwt = require('jsonwebtoken');
const nocache = require("nocache");

const userRoutes = require("./app/routes/user/userRoutes");
const adminRoutes = require("./app/routes/admin/adminRoutes");
const connectDatabase = require("./app/config/database");
const { redirectIfAdminLoggedIn } = require("./app/middlewares/redirectIfLoggedIn");
const {status} = require("http-status");
const {generalLimiter} = require("./app/middlewares/rateLimiter");
const User = require('./app/models/userModel');
const Admin = require('./app/models/adminModel');

// Initialize application
const app = express();
app.set("view engine", "ejs");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use(methodOverride("_method"));
app.use(nocache());

// Configure session middleware
app.use(session({
  secret: 'your_secret_key', // Use a secure key in production
  resave: false,
  saveUninitialized: true
}));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "public/uploads/products");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Connect to the database
connectDatabase();

// Set no-cache for static files in production environment
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

// Custom middleware
app.use(redirectIfAdminLoggedIn);

// Global Rate Limiter
// app.use(generalLimiter);

// Routes
app.use("/", userRoutes);
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

    res.status(status.NOT_FOUND).render("404", { user, admin });
  } catch (error) {
    console.error("Error in 404 handler:", error.message);
    res.status(status.NOT_FOUND).render("404", { user: null, admin: null });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(status.BAD_REQUEST).render("500", {
      message: "File too large. Please upload smaller files.",
    });
  }

  if (req.xhr || req.headers.accept.indexOf("json") > -1) {
    return res.status(status.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
  }

  res.status(status.INTERNAL_SERVER_ERROR).render("500", { message: "Internal Server Error" });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  const environment = process.env.NODE_ENV || 'development';
  
  // console.log('\n\x1b[36m%s\x1b[0m', '==================================================');
  // console.log('\x1b[1m%s\x1b[0m', `  🎸 GUITMAN SERVER`);
  // console.log('\x1b[36m%s\x1b[0m', '--------------------------------------------------');
  // console.log(`  📅 Timestamp:   \x1b[33m${timestamp}\x1b[0m`);
  // console.log(`  🌐 Server URL:  \x1b[33mhttp://localhost:${PORT}\x1b[0m`);
  // console.log(`  🔌 Port:        \x1b[33m${PORT}\x1b[0m`);
  // console.log(`  ⚙️  Environment: \x1b[33m${environment}\x1b[0m`);
  // console.log('\x1b[36m%s\x1b[0m', '==================================================\n');
});
// const PORT = process.env.PORT || 8080;
// app.listen(PORT, '172.20.10.4', () => {
//   console.log(`GuitMan is live on http://172.20.10.4:${PORT}`);
// });