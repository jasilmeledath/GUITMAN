const User = require("../../models/userModel");
const {status} = require("http-status")

const adminControls = {
  /**
   * Toggles a user's active status (block/unblock).
   * - Retrieves the user ID from request parameters.
   * - Determines the action (`block` or `unblock`) and updates the `isActive` status accordingly.
   * - Responds with the updated user's status.
   *
   * @param {Object} req - Express request object containing the user ID and action.
   * @param {Object} res - Express response object to send back the result.
   * @param {Function} next - Express next function to handle errors.
   */
  toggleUserStatus: async (req, res, next) => {
    try {
      const userId = req.params.id;
      const action = req.params.action; 

      const isActive = action === "unblock";

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { isActive },
        { new: true } 
      );

      if (!updatedUser) {
        return res.status(status.NOT_FOUND).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(status.OK).json({
        success: true,
        message: `User ${isActive ? "unblocked" : "blocked"} successfully`,
        isActive: updatedUser.isActive,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = adminControls;