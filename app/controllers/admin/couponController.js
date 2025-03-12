const Coupon = require('../../models/couponModel');
const httpStatus = require('../../utils/httpStatus');

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
  }
};

module.exports = couponControls;
