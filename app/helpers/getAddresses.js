const Address = require("../models/addressModel");
const jwt = require("jsonwebtoken");

const getToken = (req, res, next) => {
  try {
    const token = req.cookies.authToken;
    return token;
  } catch (err) {
    next(err);
  }
};

const getAddresses = async (req, res, next) => {
  try {
    const token = getToken(req, res, next);
    if (!token) {
      return null;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const addresses = await Address.find({ user: userId });
    if (!addresses || addresses.length === 0) {
      return null;
    }
    return addresses;
  } catch (err) {
    console.error("Error fetching addresses", err);
    next(err);
  }
};

module.exports = getAddresses;
