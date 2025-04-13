/**
 * Category Controller Module
 * Manages product category operations including creation, editing, and visibility control
 * 
 * @module controllers/categoryControls
 */

const Category = require("../../models/categoryModel");
const httpStatus = require("../../utils/httpStatus");
const { adminErrors, adminSuccess } = require("../../utils/messages");

const categoryControls = {
  /**
   * Adds a new product category
   *
   * @param {Object} req - Express request object containing category data
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
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
   * Updates an existing category
   *
   * @param {Object} req - Express request object containing updated category data
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  editCategory: async (req, res, next) => {
    try {
      const categoryId = req.params.id;
      const { name, description } = req.body;
      const image = req.file;
      
      // Note: Duplicate name validation is currently disabled
      
      const updateFields = { name, description };
      if (image) {
        updateFields.image = `uploads/product-images/${image.filename}`;
      }
      
      await Category.findByIdAndUpdate(categoryId, updateFields);
      res.status(httpStatus.OK).json({ 
        success: true, 
        message: adminSuccess.categoryManagement.categoryUpdated 
      });
    } catch (err) {
      next(err);
    }
  },
  
  /**
   * Makes a category visible to users (unblock)
   *
   * @param {Object} req - Express request object containing category ID
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  listCategory: async (req, res, next) => {
    try {
      const id = req.params.id;
      const updatedCategory = await Category.findByIdAndUpdate(
        id, 
        { isBlocked: false }, 
        { new: true }
      );
      
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
   * Makes a category invisible to users (block)
   *
   * @param {Object} req - Express request object containing category ID
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  unlistCategory: async (req, res, next) => {
    try {
      const id = req.params.id;
      const updatedCategory = await Category.findByIdAndUpdate(
        id, 
        { isBlocked: true }, 
        { new: true }
      );
      
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
};

module.exports = categoryControls;