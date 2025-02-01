const generateOTP = require("../utils/generateOtp");

const createOtp = () => {
  return {
    otp: generateOTP(),
    otpExpires: new Date(Date.now() + 10 * 60 * 1000), // OTP valid for 10 mins
  };
};

module.exports = { createOtp };