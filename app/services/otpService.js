function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const createOtp = () => {
    return {
        otp: generateOTP(),
        otpExpires: new Date(Date.now() + 2 * 60 * 1000), // OTP valid for 2 mins
    };
};

module.exports = { generateOTP, createOtp };