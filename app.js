const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const path = require('path');
const methodOverride = require("method-override");
const userRoutes = require('./app/routes/user/userRoutes');
const adminRoutes = require('./app/routes/admin/adminRoutes');
const connectDatabase = require('./app/config/database');
const cookieParser = require('cookie-parser');
const Product = require('./app/models/productModel');
const Category = require('./app/models/categoryModel');
// Initialize application
const app = express();
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(methodOverride("_method"));
const nocache = require('nocache');
const redirectIfLoggedIn = require('./app/middlewares/redirectIfLoggedIn');

// Connect database
connectDatabase();

// No-cache middleware
app.use(nocache());

// Set no-cache for static files in production environment
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// app.use(redirectIfLoggedIn);

// Routes
app.get('/', async (req, res) => {
    try {
        const categories = await Category.find({isBlocked:false});
        
        const products = await Product.find({ isTopModel: true });
        res.render('frontend/landing', { products, categories, currentRoute: req.path, user: req.user || null });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Apply verifyUser middleware with exclusions
app.use('/', userRoutes);

// Admin routes
app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('404');
});

// Start server
app.listen(process.env.PORT, () => {
    console.log(`GuitMan is live on port: ${process.env.PORT}`);
});
