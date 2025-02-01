const validateOtpRequest = ({ email, otp }) => {
    const validationErrors = {};

    if (!email) {
      validationErrors.email = "Email is required.";
    }
  
    if (!otp) {
      validationErrors.otp = "OTP is required.";
    }
  
    const isRequestValid = Object.keys(validationErrors).length === 0;
  
    return { isRequestValid, validationErrors };
  };
  
  module.exports = { validateOtpRequest };