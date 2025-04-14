const nodemailer = require('nodemailer');
const { generateAdminEmailTemplate, generateUserConfirmationTemplate } = require('../utils/contactEmailTemplates');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Service to handle email operations
 */
class EmailService {
  /**
   * Initialize email transporter
   * @returns {Object} - Nodemailer transporter
   */
  static getTransporter() {
    return nodemailer.createTransport({
      service: config.email.service,
      auth: {
        user: config.email.adminEmail,
        pass: config.email.adminPassword
      },
      secure: true
    });
  }

  /**
   * Send notification email to admin about new contact form submission
   * @param {Object} contactData - The contact form data
   * @returns {Promise<Object>} - Email sending result
   */
  static async sendContactNotification(contactData) {
    try {
      const { name, email, phone, subject, message } = contactData;
      const transporter = this.getTransporter();
      
      const mailOptions = {
        from: `"Contact Form" <${config.email.adminEmail}>`,
        to: config.email.supportEmail,
        subject: `New Contact Form Submission: ${subject}`,
        html: generateAdminEmailTemplate({ name, email, phone, subject, message }),
        replyTo: email
      };
      
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      logger.error('Error sending admin notification email:', error);
      throw new Error('Failed to send notification email');
    }
  }

  /**
   * Send confirmation email to user
   * @param {Object} userData - The user data
   * @returns {Promise<Object>} - Email sending result
   */
  static async sendContactConfirmation(userData) {
    try {
      const { name, email, subject } = userData;
      const transporter = this.getTransporter();
      
      const mailOptions = {
        from: `"${config.app.name}" <${config.email.adminEmail}>`,
        to: email,
        subject: `Thank you for contacting us - ${subject}`,
        html: generateUserConfirmationTemplate({ name, subject }),
      };
      
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      logger.error('Error sending user confirmation email:', error);
      // We don't want the entire process to fail if just the confirmation email fails
      // Just log the error and continue
    }
  }
}

module.exports = EmailService;