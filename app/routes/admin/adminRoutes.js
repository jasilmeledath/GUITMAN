const express = require('express');
const router = express.Router();
const adminAuth = require("../../controllers/admin/adminAuth");
const verifyAdmin = require("../../middlewares/verifyAdmin");
const noCache = require("../../middlewares/noCache");
const dashRoutes = require("./dashRoutes");
const protectAdminRoutes = require("../../middlewares/protectAdminRoutes");

router.get('/login',noCache, adminAuth.loadLogin);
router.post('/login', adminAuth.login);
router.get('/dashboard', noCache, verifyAdmin, adminAuth.loadDashboard);
router.use('/dashboard', verifyAdmin, dashRoutes);
router.get('/logout',noCache, adminAuth.logout);



// Add Admin Route
// router.post('/add-admin', adminAuth.addAdmin );



module.exports = router;