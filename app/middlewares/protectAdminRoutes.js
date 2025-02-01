const jwt = require('jsonwebtoken');
const protectAdmin = (req, res, next) => {
    const token = req.cookies.authToken;

    if (!token) {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.isAdmin) {
            return res.status(403).redirect('/home');
        }

        next(); 
    } catch (error) {
        console.error("Admin Access Error:", error);
        return res.status(401).json({ message: "Invalid token." });
    }
};

module.exports = protectAdmin;