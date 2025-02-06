const Category = require("../models/categoryModel");

const validateAddCategory = async (req, res, next) => {
  const { name, description } = req.body;
  const errors = {};

  try {
    // Validate category name
    if (!name || name.trim() === "") {
      errors.name = "Category name is required.";
    } else {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });
      if (existingCategory) {
        errors.name = "Category name already exists.";
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

    // If there are validation errors, render the form with errors
    if (Object.keys(errors).length > 0) {
      return res.render("backend/addCategory", {
        errors,
        formData: req.body,
      });
    }

    next(); // Proceed if no validation errors
  } catch (err) {
    next(err);
  }
};

module.exports = validateAddCategory;