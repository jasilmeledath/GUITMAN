const express = require('express');
const router = express.Router();
const adminAuth = require("../../controllers/admin/adminAuth");
const verifyAdmin = require("../../middlewares/verifyAdmin");
const noCache = require("../../middlewares/noCache");
const dashRoutes = require("./dashRoutes");
const loadAdminPage  =require("../../controllers/admin/loadAdminpage");
const protectAdminRoutes = require("../../middlewares/protectAdminRoutes");

router.get('/login',noCache, loadAdminPage.login);
router.post('/login', adminAuth.login);
router.get('/dashboard', noCache, verifyAdmin, loadAdminPage.dashboard);
router.use('/dashboard', verifyAdmin, dashRoutes);
router.get('/logout',noCache, adminAuth.logout);



// Add Admin Route
// router.post('/add-admin', adminAuth.addAdmin );



module.exports = router;