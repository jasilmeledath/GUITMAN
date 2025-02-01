const Category = require("../../models/categoryModel");
const User = require("../../models/userModel");
const Address = require("../../models/addressModel");
const Offer = require("../../models/offerModel");
const Product = require("../../models/productModel");
const adminDash = {
  loadUserList: async (req, res) => {
    try {
      const users = await User.find({});
      res.render("backend/userList", { users });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  loadUserCards: (req, res) => {
    res.render("backend/userCards");
  },
  loadUserDetails: async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);
      const addresses = await Address.find({ user: userId });

      if (!user) {
        return res.status(404).send("User not found");
      }
      if (!addresses.length) {
        addresses[0] = { country: " ", address: " ", pincode: " " };
      }

      res.render("backend/userDetails", { user, addresses });
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  loadOffers: async (req, res) => {
    try {
      // Fetch categories from the database
      const offers = await Offer.find({});

      // Pass categories to the EJS template
      res.render("backend/offers", { offers });
    } catch (error) {
      console.error("Error loading offers:", error);
      res.status(500).send("Unable to load offers.");
    }
  },
};

module.exports = adminDash;
