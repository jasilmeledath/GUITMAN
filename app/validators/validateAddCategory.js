const Category = require("../models/categoryModel");
const errorMessages = require("../utils/messages");

const validateAddCategory = async (req, res, next) => {
  const { name, description } = req.body;
  const errors = {};

  try {
    // Validate name
    if (!name || name.trim() === "") {
      errors.name = "Category name is required.";
    } else {
      // Check for existing category
      const existingCategory = await Category.findOne({ name: name.trim() });
      if (existingCategory) {
        errors.name = "Category with this name already exists.";
      }
    }

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

    // If there are validation errors, store them in session and redirect
    if (Object.keys(errors).length > 0) {
      req.session.errors = errors;
      req.session.formData = req.body; // Save form data to repopulate the form
      return res.redirect("/admin/add-product");
    }

    next(); // Proceed if validation passes
  } catch (err) {
    console.error("Error in validateAddCategory:", err.message);
    req.session.errors = {
      general: errorMessages.adminErrors.general.serverError,
    };
    res.redirect("/admin/add-product");
  }
};

module.exports = validateAddCategory;