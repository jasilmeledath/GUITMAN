const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("OTP is:", otp);
    return otp;
};
module.exports = generateOTP;