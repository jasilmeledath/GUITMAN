const Coupon = require('../models/couponModel');

/**
 * Adds the user to the coupon's "already used" list if not already present.
 *
 * This function finds a coupon by its ID and pushes the user ID into the coupon's
 * 'user_id' array if the user is not already in the list. It then saves the updated coupon document.
 *
 * @param {string|Object} couponId - The ID of the coupon.
 * @param {string|Object} userId - The ID of the user to add.
 * @returns {Promise<Object>} The updated coupon document.
 * @throws {Error} Throws an error if the coupon is not found or if an error occurs during update.
 */
async function addUserToCouponUsedList(couponId, userId) {
  try {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw new Error('Coupon not found');
    }

    if (!coupon.user_id.includes(userId)) {
      coupon.user_id.push(userId);
      await coupon.save();
    }

    return coupon;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  addUserToCouponUsedList,
};
