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
      const { product_name, description, price, category, isActive, stock } = req.body;
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
        offer: null,
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
};

module.exports = productController;
