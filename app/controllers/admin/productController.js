const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Offer = require("../../models/offerModel");
const httpStatus = require("../../utils/httpStatus");
const { adminErrors, adminSuccess } = require("../../utils/messages");

const productController = {
  /**
   * Adds a new product to the database.
   * - Parses the product data from the request body.
   * - Creates a new product document and saves it to the database.
   * - Redirects to the product listing page upon success.
   *
   * @param {Object} req - Express request object containing product details.
   * @param {Object} res - Express response object for redirecting after creation.
   * @param {Function} next - Express next function for error handling.
   */
  addProduct: async (req, res, next) => {
    try {
      const { product_name, description, price, category, offer, isActive, stock } = req.body;
      const images = req.body.images;
      const isTopModel = req.body.isTopModel === "on";
      const isActiveParsed = req.body.isActive === "on";

      const newProduct = new Product({
        product_name,
        description,
        price,
        stock: stock || 0,
        images,
        category,
        offer: offer || null,
        isActive: isActiveParsed || isActive,
        isTopModel,
      });

      await newProduct.save();
      res.status(httpStatus.CREATED).redirect('/admin/dashboard/product/list-product');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Toggles the active state of a product.
   * - Updates the product's `isActive` field based on the request.
   *
   * @param {Object} req - Express request object containing product ID and active state.
   * @param {Object} res - Express response object to confirm the update.
   * @param {Function} next - Express next function for error handling.
   */
  productToggle: async (req, res, next) => {
    try {
      const productId = req.params.id;
      const isActive = req.body.isActive === true || req.body.isActive === 'true';
      await Product.findByIdAndUpdate(productId, { isActive });
      res.status(httpStatus.OK).json({ success: true, isActive });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Updates an existing product's details.
   * - Updates only fields provided in the request body.
   * - Handles updating images and category information.
   *
   * @param {Object} req - Express request object containing updated product data.
   * @param {Object} res - Express response object to confirm the update.
   * @param {Function} next - Express next function for error handling.
   */
  updateProduct: async (req, res, next) => {
    try {
      const productId = req.params.id;
      let product = await Product.findById(productId);
      if (!product) {
        return res.status(httpStatus.NOT_FOUND).json({ message: adminErrors.productManagement.productNotFound });
      }

      if (req.body.product_name) product.product_name = req.body.product_name;
      if (req.body.description) product.description = req.body.description;
      if (req.body.price) product.price = Number(req.body.price);
      if (req.body.stock) product.stock = Number(req.body.stock);
      if (req.body.category) product.category = req.body.category;

      product.offer = req.body.offer && req.body.offer.trim() !== '' ? req.body.offer : null;
      if (req.body.isTopModel !== undefined) {
        product.isTopModel = req.body.isTopModel === 'true';
      }

      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          const match = file.fieldname.match(/images_(\d+)/);
          if (match) {
            const index = parseInt(match[1], 10);
            product.images[index] = req.body.images.shift();
          }
        });
      }

      await product.save();
      res.status(httpStatus.OK).json({ message: adminSuccess.productManagement.productUpdated, product });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Adds a new category to the database.
   * - Validates if a category with the same name already exists.
   * - Saves the new category and redirects to the category management page.
   *
   * @param {Object} req - Express request object containing category data.
   * @param {Object} res - Express response object for redirecting after creation.
   * @param {Function} next - Express next function for error handling.
   */
  addCategory: async (req, res, next) => {
    try {
      const { name, description } = req.body;
      const image = req.file;

      if (!image) {
        return res.status(httpStatus.BAD_REQUEST).render("admin/dashboard/product/categories", {
          error: adminErrors.general.noImage
        });
      }

      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp("^" + name + "$", "i") }
      });
      if (existingCategory) {
        const categories = await Category.find();
        return res.status(httpStatus.BAD_REQUEST).render("backend/categories", {
          error: adminErrors.categoryManagement.alreadyExisting,
          categories,
        });
      }

      const category = new Category({
        name,
        description,
        image: image.path
      });

      await category.save();
      res.redirect("/admin/dashboard/product/categories");
    } catch (err) {
      next(err);
    }
  },

  /**
   * Edits an existing category's details.
   * - Validates if a category with the new name already exists.
   * - Updates the category document with new data.
   *
   * @param {Object} req - Express request object containing updated category data.
   * @param {Object} res - Express response object confirming the update.
   * @param {Function} next - Express next function for error handling.
   */
  editCategory: async (req, res, next) => {
    try {
      const categoryId = req.params.id;
      const { name, description } = req.body;
      const image = req.file;

      // const existingCategory = await Category.findOne({
      //   name: { $regex: new RegExp("^" + name + "$", "i") },
      //   _id: { $ne: categoryId }
      // });
      // if (existingCategory) {
      //   return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: adminErrors.categoryManagement.alreadyExisting });
      // }

      const updateFields = { name, description };
      if (image) {
        updateFields.image = `uploads/product-images/${image.filename}`;
      }
      await Category.findByIdAndUpdate(categoryId, updateFields);
      res.status(httpStatus.OK).json({ success: true, message: adminSuccess.categoryManagement.categoryUpdated });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Unblocks a category, making it visible to users.
   *
   * @param {Object} req - Express request object containing category ID.
   * @param {Object} res - Express response object confirming the unblock.
   * @param {Function} next - Express next function for error handling.
   */
  listCategory: async (req, res, next) => {
    try {
      const id = req.params.id;
      const updatedCategory = await Category.findByIdAndUpdate(id, { isBlocked: false }, { new: true });

      if (!updatedCategory) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: adminErrors.categoryManagement.alreadyExisting,
        });
      }

      res.status(httpStatus.OK).json({
        success: true,
        message: adminSuccess.categoryManagement.listed,
        category: updatedCategory,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Blocks a category, making it invisible to users.
   *
   * @param {Object} req - Express request object containing category ID.
   * @param {Object} res - Express response object confirming the block.
   * @param {Function} next - Express next function for error handling.
   */
  unlistCategory: async (req, res, next) => {
    try {
      const id = req.params.id;
      const updatedCategory = await Category.findByIdAndUpdate(id, { isBlocked: true }, { new: true });

      if (!updatedCategory) {
        return res.status(httpStatus.NOT_FOUND).json({
          success: false,
          message: adminErrors.categoryManagement.notFound,
        });
      }

      res.status(httpStatus.OK).json({
        success: true,
        message: adminSuccess.categoryManagement.unlisted,
        category: updatedCategory,
      });
    } catch (err) {
      next(err);
    }
  },

  addOffer: async (req, res, next) => {
    try {
      const {
        offer_type,
        offer_percentage,
        expiry_date,
        products,
        categories,
        referral_code,
        referral_bonus
      } = req.body;
  
      // Validate required fields
      if (!offer_type || !expiry_date) {
        return res.status(400).json({
          success: false,
          message: 'Offer type and expiry date are required.'
        });
      }
  
      // Validate expiry date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const offerExpiryDate = new Date(expiry_date);
      if (offerExpiryDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Expiry date must be today or a future date.'
        });
      }
  
      // Validate non-negative numeric values for offer percentage and price
      if (offer_percentage < 0) {
        return res.status(400).json({
          success: false,
          message: 'Offer percentage and offer price cannot be negative.'
        });
      }
  
      // Validate referral offer fields if offer_type is 'referral'
      if (offer_type === 'referral') {
        if (!referral_code || referral_code.trim() === '') {
          return res.status(400).json({
            success: false,
            message: 'Referral code is required for referral offers.'
          });
        }
        if (referral_bonus < 0) {
          return res.status(400).json({
            success: false,
            message: 'Referral bonus cannot be negative.'
          });
        }
      }
  
      // Create and save the new offer
      const newOffer = new Offer({
        offer_type,
        offer_percentage,
        expiry_date,
        referral_code: offer_type === 'referral' ? referral_code : undefined,
        referral_bonus: offer_type === 'referral' ? referral_bonus : 0
      });
  
      // Attach products if offer type is 'product'
      if (offer_type === 'product' && products) {
        newOffer.products = Array.isArray(products) ? products : [products];
      }
  
      // Attach categories if offer type is 'category'
      if (offer_type === 'category' && categories) {
        newOffer.categories = Array.isArray(categories) ? categories : [categories];
      }
  
      const savedOffer = await newOffer.save();
  
      // Update related products if offer type is 'product'
      if (offer_type === 'product' && newOffer.products && newOffer.products.length > 0) {
        await Product.updateMany(
          { _id: { $in: newOffer.products } },
          { $set: { offer: savedOffer._id } }
        );
      }
  
      // Update products belonging to categories if offer type is 'category'
      if (offer_type === 'category' && newOffer.categories && newOffer.categories.length > 0) {
        await Product.updateMany(
          { category: { $in: newOffer.categories } },
          { $set: { offer: savedOffer._id } }
        );
      }
  
      return res.status(201).json({
        success: true,
        message: 'Offer created successfully',
        offer: savedOffer
      });
    } catch (error) {
      next(error);
    }
  },  
  /**
 * Toggle offer status.
 * - Finds the offer by ID, updates its isActive status.
 * - If deactivated, removes the offer reference from related products.
 * - If activated, adds the offer reference back to related products based on offer type.
 *
 * @param {Object} req - Express request object containing offer ID and isActive in body.
 * @param {Object} res - Express response object confirming the update.
 * @param {Function} next - Express next function for error handling.
 */
toggleActiveOffer: async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const offer = await Offer.findByIdAndUpdate(id, { isActive: isActive }, { new: true });
    if (!offer) {
      return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "Offer not found" });
    }
    if (!isActive) {
      // When deactivated, remove the offer reference from all products that have this offer.
      await Product.updateMany(
        { offer: offer._id },
        { $unset: { offer: "" } }
      );
    } else {
      // When activated, re-apply the offer to related products.
      if (offer.offer_type === 'product' && offer.products && offer.products.length > 0) {
        await Product.updateMany(
          { _id: { $in: offer.products } },
          { $set: { offer: offer._id } }
        );
      }
      if (offer.offer_type === 'category' && offer.categories && offer.categories.length > 0) {
        await Product.updateMany(
          { category: { $in: offer.categories } },
          { $set: { offer: offer._id } }
        );
      }
    }
    res.status(httpStatus.OK).json({ success: true, message: `Offer ${isActive ? 'activated' : 'deactivated'} successfully!`, offer });
  } catch (error) {
    next(error);
  }
},

  /**
   * Deletes an offer from the database.
   * - Finds and removes the offer by ID.
   *
   * @param {Object} req - Express request object containing offer ID.
   * @param {Object} res - Express response object confirming the deletion.
   * @param {Function} next - Express next function for error handling.
   */
  deleteOffer: async (req, res, next) => {
    const { id } = req.params;

    try {
      const deletedOffer = await Offer.findByIdAndDelete(id);

      if (!deletedOffer) {
        return res.status(httpStatus.NOT_FOUND).json({ success: false, message: 'Offer not found' });
      }

      res.status(httpStatus.OK).json({
        success: true,
        message: 'Offer deleted successfully',
        deletedOffer,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = productController;
