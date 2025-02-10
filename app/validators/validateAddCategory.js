const Category = require("../models/categoryModel");
const errorMessages = require("../utils/errorMessages");

const validateAddCategory = async (req, res, next) => {
  const { name, description } = req.body;
  const errors = {};

  try {

    // Validate description
    if (!description || description.trim() === "") {
      errors.description = "Description is required.";
    }

    // Validate image
    if (!req.file) {
      errors.image = "Category image is required.";
    } else {
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        errors.image = "Only image files are allowed (JPG, PNG).";
      }
    }

    // If there are validation errors, render the form with errors
    if (Object.keys(errors).length > 0) {
        req.session.errors = errors;
        req.session.formData = req.body;
        return res.redirect('/admin/add-product');
      }
  
      next();
    } catch (err) {
      console.error("Error in validateAddProduct:", err.message);
      req.session.errors = { general: errorMessages.adminErrors.general.serverError};
      res.redirect('/admin/add-product');
    }
  };
module.exports = validateAddCategory;