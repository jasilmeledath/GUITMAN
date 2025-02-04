const userErrors = {
    login: {
      noToken: 'Access denied. Please log in to continue.',
      invalidToken: 'Your session is invalid. Please log in again.',
      sessionExpired: 'Your session has expired. Please log in to continue.',
      invalidCredentials: 'Incorrect email or password. Please try again.',
      userNotFound: 'No account found with this email. Please sign up.',
      userInactive: 'Your account is currently inactive. Contact support for assistance.'
    },
    registration: {
      emailExists: 'An account with this email already exists. Try logging in instead.',
      weakPassword: 'Your password must be at least 8 characters long and include a number and a special character.',
      invalidEmail: 'Please enter a valid email address.',
      otpError: 'We encountered an issue sending the OTP. Please try again later.',
      otpMismatch: 'The OTP you entered is incorrect. Please check and try again.'
    },
    profile: {
      updateFailed: 'We were unable to update your profile. Please try again later.',
      invalidEmail: 'The email format is incorrect. Please enter a valid email address.',
      emailExists: 'This email is already associated with another account.',
      weakPassword: 'Your new password must be at least 8 characters long and include a number and a special character.',
      unauthorized: 'You are not authorized to access this resource.'
    },
    products: {
      notFound: 'Sorry, the requested product could not be found.',
      outOfStock: 'This product is currently out of stock. Check back later.',
      invalidCoupon: 'The coupon code entered is invalid or has expired.',
      reviewFailed: 'There was an issue submitting your review. Please try again later.'
    },
    checkout: {
      addressMissing: 'Please provide a shipping address to proceed with checkout.',
      paymentFailed: 'Your payment was unsuccessful. Please try again or use a different payment method.',
      cartEmpty: 'Your cart is empty. Add items to continue.'
    },
    general: {
      serverError: 'Something went wrong on our end. Please try again later. Please contact support.',
      forbidden: 'You do not have permission to perform this action.',
      notFound: 'The requested resource could not be found.'
    }
  };
  
  const adminErrors = {
    login: {
      noToken: 'Access denied. Please log in as an admin to continue.',
      invalidToken: 'Your session is invalid. Please log in again.',
      sessionExpired: 'Your session has expired. Please log in again.',
      invalidCredentials: 'Incorrect email or password. Please try again.',
      adminNotFound: 'No admin account found with this email.',
      adminInactive: 'Your admin account is currently inactive. Contact support for assistance.'
    },
    productManagement: {
      addFailed: 'Unable to add the product. Please check your input and try again.',
      productNotFound: 'Unable to load product. Please try again later.',
      updateFailed: 'Product update failed. Verify the details and try again.',
      deleteFailed: 'We encountered an error while deleting the product. Please try again.',
      invalidProductId: 'Invalid product ID. Please provide a valid one.',
      outOfStock: 'This product is currently out of stock.',
      categoryRequired: 'Please select a category for the product.'
    },
    categoryManagement: {
      addFailed: 'Failed to add the category. Please try again.',
      updateFailed: 'Unable to update category details. Please try again.',
      deleteFailed: 'Error deleting category. Ensure there are no associated products and try again.',
      invalidCategoryId: 'Invalid category ID provided.'
    },
    userManagement: {
      userNotFound: 'The specified user was not found.',
      updateFailed: 'Unable to update user details. Please try again.',
      deleteFailed: 'Error deleting user. Please try again later.',
      unauthorized: 'You do not have permission to perform this action.'
    },
    orderManagement: {
      orderNotFound: 'The requested order could not be found.',
      updateFailed: 'Failed to update the order status. Please try again later.',
      cancelFailed: 'Unable to cancel the order. Please try again or contact support.'
    },
    general: {
      serverError: 'An internal server error occurred. Please try again later.',
      forbidden: 'You do not have the necessary permissions to perform this action.',
      notFound: 'The requested resource was not found.'
    }
  };
  
  module.exports = { userErrors, adminErrors };