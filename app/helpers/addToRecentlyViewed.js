const Wishlist = require('../models/wishlistModel');

/**
 * Adds a product to the user's recently viewed list.
 *
 * If the product already exists in the list, its `viewedAt` timestamp is updated.
 * Otherwise, the product is added. Optionally, the list is kept to a maximum number of entries.
 *
 * @param {string|Object} userId - The ID of the user.
 * @param {string|Object} productId - The ID of the product to add.
 * @returns {Promise<Object>} The updated wishlist document.
 * @throws {Error} Throws an error if the operation fails.
 */
async function addToRecentlyViewed(userId, productId) {
  try {
    // Find the wishlist for the user; create one if it doesn't exist.
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, items: [], recentlyViewed: [] });
    }

    // Look for an existing entry for this product in recentlyViewed.
    const existingIndex = wishlist.recentlyViewed.findIndex(rv => rv.product.toString() === productId.toString());
    if (existingIndex !== -1) {
      // Update the viewedAt timestamp.
      wishlist.recentlyViewed[existingIndex].viewedAt = new Date();
    } else {
      // Add the product to recently viewed.
      wishlist.recentlyViewed.push({ product: productId, viewedAt: new Date() });
      // Optionally, limit the recentlyViewed array to the 10 most recent items.
      if (wishlist.recentlyViewed.length > 10) {
        // Sort by viewedAt descending and keep only the first 10 entries.
        wishlist.recentlyViewed.sort((a, b) => b.viewedAt - a.viewedAt);
        wishlist.recentlyViewed = wishlist.recentlyViewed.slice(0, 10);
      }
    }
    await wishlist.save();
    return wishlist;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  addToRecentlyViewed,
};
