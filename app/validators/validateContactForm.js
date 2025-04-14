/**
 * Validate contact form data
 * @param {Object} formData - The form data to validate
 * @returns {Object} - Validation result with error and validated data
 */
exports.validateContactForm = (formData) => {
    const { name, email, phone, subject, message } = formData;
    const errors = {};
  
    // Validate name
    if (!name || name.trim() === '') {
      errors.name = 'Name is required';
    } else if (name.length > 100) {
      errors.name = 'Name cannot exceed 100 characters';
    }
  
    // Validate email
    if (!email || email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }
  
    // Validate phone (optional)
    if (phone && !isValidPhone(phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
  
    // Validate subject
    if (!subject || subject.trim() === '') {
      errors.subject = 'Subject is required';
    } else if (subject.length > 200) {
      errors.subject = 'Subject cannot exceed 200 characters';
    }
  
    // Validate message
    if (!message || message.trim() === '') {
      errors.message = 'Message is required';
    } else if (message.length > 5000) {
      errors.message = 'Message cannot exceed 5000 characters';
    }
  
    // If there are errors, return them
    if (Object.keys(errors).length > 0) {
      return { error: errors, formData: null };
    }
  
    // Return sanitized data
    return {
      error: null,
      formData: {
        name: sanitizeInput(name),
        email: email.trim().toLowerCase(),
        phone: phone ? sanitizeInput(phone) : '',
        subject: sanitizeInput(subject),
        message: sanitizeInput(message)
      }
    };
  };
  
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - Is email valid
   */
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validate phone format (basic validation)
   * @param {string} phone - Phone to validate
   * @returns {boolean} - Is phone valid
   */
  function isValidPhone(phone) {
    // Basic phone validation (can be improved based on requirements)
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  }
  
  /**
   * Sanitize user input to prevent XSS attacks
   * @param {string} input - Input to sanitize
   * @returns {string} - Sanitized input
   */
  function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }