const FeedbackService = require('../../services/feedbackService');
const EmailService = require('../../services/emailService');
const { validateContactForm } = require('../../validators/validateContactForm');
const logger = require('../../utils/logger');
const httpStatus = require('../../utils/httpStatus');

const contactPageControls = {
    submitContactForm : async (req, res) => {
        try {
            console.log('invoked');
            
          const { error, formData } = validateContactForm(req.body);
          if (error) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
              success: false, 
              message: 'Validation error', 
              errors: error 
            });
          }
      
          const { name, email, phone, subject, message } = formData;
          
          // Save feedback to database
          await FeedbackService.saveFeedback({ name, email, phone, subject, message });
          
          // Send notification email
          await EmailService.sendContactNotification({ name, email, phone, subject, message });
          
          // Send confirmation email to user
          await EmailService.sendContactConfirmation({ name, email, subject });
      
          // Respond with success message
          return res.status(httpStatus.OK).json({ 
            success: true, 
            message: 'Your message has been sent successfully! We will get back to you soon.'
          });
          
        } catch (error) {
          logger.error('Contact form submission error:', error);
          return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'An error occurred while submitting the form. Please try again later.' 
          });
        }
    }
} 
module.exports = contactPageControls;