const Product = require("../models/productModel");
const Category = require("../models/categoryModel");

const validateAddProduct = async (req, res, next) => {


  const { product_name, price, stock, description, category } = req.body;
  const errors = {};

  try {
    // Validate product name
    if (!product_name || product_name.trim() === "") {
      errors.product_name = "Product name is required.";
    } else {
      const existingProduct = await Product.findOne({
        product_name: { $regex: new RegExp(`^${product_name.trim()}$`, "i") },
      });
      if (existingProduct) {
        errors.product_name = "Product name already exists.";
      }
    }

    // Validate price
    if (price === undefined || price === null || price === "") {
      errors.price = "Price is required.";
    } else if (isNaN(price) || price <= 0) {
      errors.price = "Price must be a positive number.";
    }

    // Validate stock
    if (stock !== undefined && stock !== "" && (isNaN(stock) || stock < 0)) {
      errors.stock = "Stock must be a non-negative number.";
    }

    // Validate description
    if (!description || description.trim() === "") {
      errors.description = "Description is required.";
    } else if (description.length < 10) {
      errors.description = "Description must be at least 10 characters long.";
    }

    // Validate category
    if (!category || category.trim() === "") {
      errors.category = "Category is required.";
    } else {
      const existingCategory = await Category.findById(category);
      if (!existingCategory) {
        errors.category = "Invalid category selected.";
      }
    }

    // Validate images
    if (!req.files || req.files.length < 3) {
      errors.images = "You must upload at least 3 images.";
    } else {
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
      for (const file of req.files) {
        if (!allowedTypes.includes(file.mimetype)) {
          errors.images = "Only image files are allowed (JPG, PNG).";
          break;
        }
      }
    }

    // Fetch categories to re-render the form if there are errors
    const [categories] = await Promise.all([
      Category.find(),
    ]);

    // If errors exist, store them in the session and redirect to the form
    if (Object.keys(errors).length > 0) {
      req.session.errors = errors;
      req.session.formData = req.body;
      return res.redirect("/admin/dashboard/product/add-product");
    }

    next(); // Proceed if no validation errors
  } catch (err) {
    console.error("Error in validateAddProduct:", err.message);
    next(err);
  }
};

module.exports = validateAddProduct;
