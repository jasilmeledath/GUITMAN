const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Offer = require("../../models/offerModel");
const httpStatus = require("../../utils/httpStatus");

const productController = {
  addProduct: async (req, res, next) => {
  
    try {
      const { product_name, description, price, category, offer, isActive, stock } = req.body;
      const images = req.body.images; 
  
      // Create a new product
      const newProduct = new Product({
        product_name,
        description,
        price,
        stock: stock || 0, // Set default stock to 0 (if not provided)
        images,
        category,
        offer: offer || null,
        isActive: isActive === "true", // Convert string to boolean
      });
  
      // Save to the database
      await newProduct.save();
  
      res.status(httpStatus.CREATED).render ('backend/productList');
    } catch (err) {
      next(err);
    }
  },

  toggle: async (req, res, next) => {
    try {
      const productId = req.params.id;
      // Convert req.body.isActive to boolean if necessary
      const isActive = req.body.isActive === true || req.body.isActive === 'true';
      await Product.findByIdAndUpdate(productId, { isActive });
      res.status(200).json({ success: true, isActive });
    } catch (error) {
      next(error);
    }
  },
  editProduct:async (req, res) => {
    try {
      const productId = req.params.id;
      const { name, description, price, stock, status, category, offer } = req.body;
      const images = req.files ? req.files.map(file => `uploads/product-images/${file.filename}`) : req.body.images;
  
      // Validation checks
      if (!productId) {
        return res
          .status(400)
          .json({ success: false, message: "Product ID is required" });
      }
  
      if (!name || !price || !stock || !status || !category) {
        return res.status(400).json({
          success: false,
          message: "Name, price, stock, status, and category are required fields.",
        });
      }
  
      if (price < 0 || stock < 0) {
        return res.status(400).json({
          success: false,
          message: "Price or stock should not be less than zero.",
        });
      }
  
      // Create update object dynamically
      const updateData = {
        product_name: name,
        price,
        stock,
        isActive: status === "active",
        category,
      };
  
      if (description) updateData.description = description;
      if (images) updateData.images = images;
      if (offer && mongoose.Types.ObjectId.isValid(offer)) {
        updateData.offer = offer; // Only include `offer` if it's a valid ObjectId
      } else {
        updateData.offer = null; // Set to null if offer is not valid
      }
  
      // Perform update
      const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true });
  
      if (!updatedProduct) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }
  
      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error) {
      console.error("Error updating product details", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
  deleteProduct: async (req, res) => {
    try {
      const productId = req.params.id;
      await Product.findByIdAndUpdate(productId, { isActive: false });
      res
        .status(200)
        .json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).send("Internel Server Error");
    }
  },
  addCategory: async (req, res) => {
    try {
      const { name, description } = req.body;
      const image = req.file; // Get the uploaded file
  
      if (!image) {
        return res.status(400).send("No image was uploaded.");
      }
  
      // Check if the category already exists
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).send("Category with this name already exists.");
      }
  
      // Create a new category
      const category = new Category({
        name,
        description,
        image: image.path // Store the image path
      });
  
      await category.save();
      res.redirect("/admin/dashboard/product/categories");
    } catch (error) {
      console.error("Error adding category:", error);
      res.status(500).send("Server error. Unable to add category.");
    }
  },

  editCategory: async (req, res) => {
    try {
      const categoryId = req.params.id;
      const { name, description } = req.body;
      const image = req.file; // Get the uploaded file
  
      const updateFields = { name, description };
      if (image) {
        updateFields.image = `uploads/product-images/${image.filename}`; // Store the relative image path
      }
      await Category.findByIdAndUpdate(categoryId, updateFields);
      res.status(200).json({ success: true, message: "Category edited successfully" });
    } catch (error) {
      console.error("Error editing category:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  },

  listCategory: async (req, res) => {
    try {
      const id = req.params.id;
      await Category.findByIdAndUpdate(id, { isBlocked: false });
      res.redirect("/admin/dashboard/product/categories");
    } catch (error) {
      console.error("Error listing category:", error);
      res.status(500).send("Internal Server Error");
    }
  },

  unlistCategory: async (req, res) => {
    try {
      const id = req.params.id;
      await Category.findByIdAndUpdate(id, { isBlocked: true });
      res.redirect("/admin/dashboard/product/categories");
    } catch (error) {
      console.error("Error unlisting category:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  addOffer: async (req, res) => {
    try {
      const { offer_type, offer_percentage, offer_price, expiry_date } =
        req.body;

      const newOffer = new Offer({
        offer_type,
        offer_percentage,
        offer_price,
        expiry_date,
      });

      await newOffer.save();
      res.redirect("/admin/dashboard/offers"); // Redirect to the offers list page after successful addition
    } catch (error) {
      console.error("Error adding offer:", error);
      res.status(500).send("Internal Server Error");
    }
  },

  deleteOffer: async (req, res) => {
    const { id } = req.params;

    try {
        // Find and delete the offer
        const deletedOffer = await Offer.findByIdAndDelete(id);

        if (!deletedOffer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Offer deleted successfully',
            deletedOffer: deletedOffer, // Optional: include deleted offer details
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
},
};
module.exports = productController;
