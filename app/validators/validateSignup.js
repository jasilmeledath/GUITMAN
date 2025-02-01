const validator = require("validator");

const validateSignup = (data) => {
  const { first_name, last_name, email, password, confirm_password } = data;
  const errors = {};

  // Validate First Name
  if (!first_name || !/^[a-zA-Z]+$/.test(first_name)) {
    errors.first_name =
      "First name should only contain alphabets and cannot be empty.";
  }

  // Validate Last Name
  if (!last_name || !/^[a-zA-Z]+$/.test(last_name)) {
    errors.last_name =
      "Last name should only contain alphabets and cannot be empty.";
  }

  // Validate Email
  if (!email || !validator.isEmail(email)) {
    errors.email = "Please enter a valid email address.";
  }

  // Validate Password
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!password || !passwordRegex.test(password)) {
    errors.password =
      "Password must be at least 8 characters long and include one uppercase letter, one number, and one special character.";
  }

  // Validate Confirm Password
  if (password !== confirm_password) {
    errors.confirm_password = "Passwords do not match.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

module.exports = { validateSignup };