const User = require('../../models/userModel');
const getUser = require('../../helpers/getUser');
const httpStatus = require('../../utils/httpStatus');

const profileControls = {
  updateProfileImage: async (req, res, next) => {
    console.log('update profile image invoked');
    
    try {
      if (!req.file) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
      }
      const user = await getUser(req,res,next);
      const userId = user._id;

      const profileImagePath = `/uploads/profile-images/${req.file.filename}`;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { profile_image: profileImagePath },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(httpStatus.NOT_FOUND).json({ message: 'User not found' });
      }
      res.status(httpStatus.OK).json({ profile_image_url: profileImagePath });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = profileControls;
