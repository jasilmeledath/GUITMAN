const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Offer = require("../../models/offerModel");

const productController = {
   loadProductList : async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        status,
        sortBy = "createdAt",
        order = "desc",
      } = req.query;
  
      // Fetch categories for dropdown
      const categories = await Category.find({}, "name");
  
      // Fetch offers for dropdown
      const offers = await Offer.find({}, "discount");
  
      // Build filter object
      const filter = {};
      if (category) filter.category = category;
      if (status) filter.isActive = status === "active";
  
      // Sorting option
      const sortOption = { [sortBy]: order === "asc" ? 1 : -1 };
  
      // Fetch products with filters, pagination, and sorting
      const products = await Product.find(filter)
        .populate("category", "name")
        .populate("offer", "discount")
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
  
      // Count total products for pagination
      const totalProducts = await Product.countDocuments(filter);
  
      // Render with pagination details, categories, and offers
      res.render("backend/productList", {
        products,
        categories,
        offers, // Pass offers to the view
        totalPages: Math.ceil(totalProducts / limit),
        currentPage: parseInt(page),
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  loadProductDetails: async (req, res) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);

      const user = req.user;
      if (!product) {
        return res.status(404).send("Product not found");
      }
      res.render("backend/productDetails", { product, user });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).send("Internal server error");
    }
  },
  loadAddProduct: async (req, res) => {
    try {
      const categories = await Category.find({});
      const offers = await Offer.find({});
      res.render("backend/addProduct", { categories, offers });
    } catch (error) {
      console.error("Error fetching categories and offers:", error);
      res.status(500).send("Internal Server Error");
    }
  },
 addProduct : async (req, res) => {
  try {
    const {
      product_name,
      description,
      price,
      stock,
      category,
      offer,
      isActive,
      isTopModel
    } = req.body;

    // Check if images were processed and uploaded
    if (!req.body.images || req.body.images.length === 0) {
      return res.status(400).send("No images were uploaded or processed.");
    }
    if (price < 0 || stock < 0) {
      return res
        .status(400)
        .send("price or stock should not be less than zero.");
    }

    // Store image paths from the resize middleware
    const images = req.body.images;

    // Handle empty offer field
    const offerId = offer === "" ? null : offer;

    // Save product to the database
    const newProduct = new Product({
      product_name,
      description,
      price,
      stock,
      images,
      category,
      offer: offerId,
      isActive: isActive === "true",
      isTopModel: isTopModel === "true"
    });

    await newProduct.save();
    res.redirect("/admin/dashboard/product/list-product");
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send("Internal Server Error");
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
  loadCategories: async (req, res) => {
    try {
      // Fetch categories from the database
      const categories = await Category.find({});
      // Pass categories to the EJS template
      res.render("backend/categories", { categories });
    } catch (error) {
      console.error("Error loading categories:", error);
      res.status(500).send("Unable to load categories.");
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
};
module.exports = productController;
