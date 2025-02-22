const Product = require('../models/productModel')
const jwt = require('jsonwebtoken');


const getProduct = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return null;
    }
    return product;
  } catch (err) {
    next(err);
  }
}

module.exports = getProduct;
