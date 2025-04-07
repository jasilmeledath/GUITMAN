const Coupon = require('../../models/couponModel');
const httpStatus = require('../../utils/httpStatus');
const User = require('../../models/userModel');

const couponControls = {
  loadCouponPage: async (req, res, next) => {
    try {
      const coupons = await Coupon.find({}).sort({ createdAt: -1 });
      res.status(httpStatus.OK).render('backend/coupons', { coupons });
    } catch (error) {
      next(error);
    }
  },
  createCoupon: async (req, res, next) => {
    try {
      const {
        coupon_code,
        coupon_type,
        discount,
        min_amount,
        max_discount,
        expire_date,
        usage_limit,
        single_use_per_user,
      } = req.body;
  
      // Validate expiry date: it must be a future date (or today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(expire_date);
      if (expiryDate < today) {
        return res.status(400).json({ success: false, message: "Expiry date must be today or in the future." });
      }
  
      const newCoupon = new Coupon({
        coupon_code,
        coupon_type,
        discount,
        min_amount: min_amount || 0,
        max_discount,
        expire_date,
        usage_limit: usage_limit || 1,
        single_use_per_user: single_use_per_user === 'true',
      });
  
      await newCoupon.save();
      res.status(httpStatus.OK).json({ success: true, message: "Coupon created successfully!" });
    } catch (error) {
      next(error);
    }
  },
  toggleActive: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const coupon = await Coupon.findByIdAndUpdate(id, { is_active: is_active }, { new: true });
      if (!coupon) {
        return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "Coupon not found" });
      }
      res.status(httpStatus.OK).json({ success: true, message: `Coupon ${is_active ? 'activated' : 'deactivated'} successfully!`, coupon });
    } catch (error) {
      next(error);
    }
  },
  deleteCoupon: async (req, res, next) => {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findByIdAndDelete(id);
      if (!coupon) {
        return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "Coupon not found" });
      }
      res.status(httpStatus.OK).json({ success: true, message: "Coupon deleted successfully!" });
    } catch (error) {
      next(error);
    }
  },
  addUser: async(req,res,next)=>{
    try {
      const {email,username, password} = req.body;
      if(!email){
        return res.status(400).json({success: false, message: "email is required"});
      }
      const newUser = new User({
        email: email,
        username: username,
        password: password
      });
      await newUser.save();
      res.status(httpStatus.OK).json({success: true, message: "User created succesfully"});
    } catch (err) {
      next(err)
    }
  }
};

module.exports = couponControls;
