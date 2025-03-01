const DebitCard = require('../models/debitCardModel');
const jwt = require("jsonwebtoken");

const getToken = (req, res, next) => {
  try {
    const token = req.cookies.authToken;
    return token;
  } catch (err) {
    next(err);
  }
};

const getDebitCards = async (req, res, next) => {
  try {
    const token = getToken(req, res, next);
    if (!token) {
      return null;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const cards = await DebitCard.find({ user: userId });
    if (!cards || cards.length === 0) {
      return null;
    }
    return cards;
  } catch (err) {
    console.error("Error fetching addresses", err);
    next(err);
  }
};

module.exports = getDebitCards;
