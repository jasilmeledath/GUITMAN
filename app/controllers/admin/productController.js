const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Offer = require("../../models/offerModel");
const httpStatus = require("../../utils/httpStatus");

const productController = {
  addProduct: async (req, res, next) => {
    try {
        const { product_name, description, price, category, offer, isActive, stock } = req.body;
        const images = req.body.images; 

        // Checkbox handling
        const isTopModel = req.body.isTopModel === "on";
        const isActiveParsed = req.body.isActive === "on";

        // Create a new product
        const newProduct = new Product({
            product_name,
            description,
            price,
            stock: stock || 0, // Set default stock to 0 (if not provided)
            images,
            category,
            offer: offer || null,
            isActive: isActiveParsed,
            isTopModel,
        });

        // Save to the database
        await newProduct.save();
        res.status(httpStatus.CREATED).redirect('/admin/dashboard/product/list-product');
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
  updateProduct:async (req, res) => {
    try {
      const productId = req.params.id;
      let product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
  
      // Update text/number fields if they are provided
      if (req.body.product_name) product.product_name = req.body.product_name;
      if (req.body.description) product.description = req.body.description;
      if (req.body.price) product.price = Number(req.body.price);
      if (req.body.stock) product.stock = Number(req.body.stock);
      if (req.body.category) product.category = req.body.category;
      // Offer may be an empty string if no offer is selected; convert it to null if so.
      product.offer = req.body.offer && req.body.offer.trim() !== '' ? req.body.offer : null;
      if (req.body.isTopModel !== undefined) {
        // Checkbox value will be "true" if checked
        product.isTopModel = req.body.isTopModel === 'true';
      }
  
      // Process any uploaded files
      // The file field names are expected to be in the format "images_<index>"
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          const match = file.fieldname.match(/images_(\d+)/);
          if (match) {
            const index = parseInt(match[1], 10);
            // Use the corresponding resized image path.
            // (Assuming that the order in req.body.images corresponds to the order of req.files)
            product.images[index] = req.body.images.shift();
          }
        });
      }
  
      // Save the updated product
      await product.save();
  
      res.status(200).json({ message: 'Product updated successfully', product });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error while updating the product' });
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
  
      // Check if an image was uploaded
      if (!image) {
        return res.status(400).render("admin/dashboard/product/categories", {
          error: "No image was uploaded."
        });
      }
  
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp("^" + name + "$", "i") }
      });
      if (existingCategory) {

        const categories = await Category.find();

        return res.status(400).render("backend/categories", {
          error: "Category with this name already exists.",
          categories: categories,
        });
      }
  
      const category = new Category({
        name,
        description,
        image: image.path 
      });
  
      await category.save();
      res.redirect("/admin/dashboard/product/categories");
    } catch (error) {
      console.error("Error adding category:", error);
      res.status(500).render("admin/dashboard/product/categories", {
        error: "Server error. Unable to add category."
      });
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
    console.log("invoked listCategory");
    
    try {
        const id = req.params.id;
        const updatedCategory = await Category.findByIdAndUpdate(id, { isBlocked: false }, { new: true });

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Category listed successfully",
            category: updatedCategory,
        });
    } catch (error) {
        console.error("Error listing category:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
},

unlistCategory: async (req, res) => {
    console.log("invoked unlistCategory");

    try {
        const id = req.params.id;
        const updatedCategory = await Category.findByIdAndUpdate(id, { isBlocked: true }, { new: true });

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Category unlisted successfully",
            category: updatedCategory,
        });
    } catch (error) {
        console.error("Error unlisting category:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
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
