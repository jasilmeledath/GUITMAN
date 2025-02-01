const Category = require("../../models/categoryModel");
const Product = require("../../models/productModel")
const Offer = require("../../models/offerModel");
const User = require("../../models/userModel");


const adminControls = {
  blockUser : async (req, res) => {
    try {
      const userId = req.params.id;
      await User.findByIdAndUpdate(userId, { isActive: false }, { new: true });
      res.redirect(`/admin/dashboard/user-details/${userId}`); // Redirect back to user details page
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  unblockUser: async (req, res) => {
    try {
      const userId = req.params.id;
      await User.findByIdAndUpdate(userId, { isActive: true }, { new: true });
      res.redirect(`/admin/dashboard/user-details/${userId}`); // Redirect back to user details page
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).send("Internal Server Error");
    }
  }
};
module.exports = adminControls;
