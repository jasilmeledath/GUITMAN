const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );
};

const hashPassword = async (password) => {
    return bcrypt.hash(password, 10);
};

const verifyPassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

module.exports = { generateToken, hashPassword, verifyPassword };