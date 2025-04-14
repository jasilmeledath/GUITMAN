const config = require('../config/config');

/**
 * Generate HTML email template for admin notifications
 * @param {Object} data - Contact form data
 * @returns {string} - HTML email template
 */
exports.generateAdminEmailTemplate = ({ name, email, phone, subject, message }) => {
  const currentDate = new Date().toLocaleString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .container {
          border: 1px solid #e0e0e0;
          border-radius: 5px;
          padding: 20px;
        }
        .header {
          background-color: #4a76a8;
          color: #ffffff;
          padding: 15px;
          border-radius: 5px 5px 0 0;
          margin: -20px -20px 20px;
        }
        .info-item {
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #f0f0f0;
        }
        .info-label {
          font-weight: bold;
          width: 100px;
          display: inline-block;
        }
        .message-box {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          border-left: 4px solid #4a76a8;
          margin: 15px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">New Contact Form Submission</h2>
          <div style="font-size: 14px;">Received on: ${currentDate}</div>
        </div>
        
        <div class="info-item">
          <span class="info-label">Subject:</span> ${subject}
        </div>
        
        <div class="info-item">
          <span class="info-label">Name:</span> ${name}
        </div>
        
        <div class="info-item">
          <span class="info-label">Email:</span> <a href="mailto:${email}">${email}</a>
        </div>
        
        <div class="info-item">
          <span class="info-label">Phone:</span> ${phone || 'Not provided'}
        </div>
        
        <h3>Message:</h3>
        <div class="message-box">
          ${message.replace(/\n/g, '<br>')}
        </div>
        
        <div style="margin-top: 20px;">
          <a href="mailto:${email}?subject=RE: ${encodeURIComponent(subject)}" style="display: inline-block; padding: 10px 15px; background-color: #4a76a8; color: white; text-decoration: none; border-radius: 4px;">Reply to Sender</a>
        </div>
        
        <div class="footer">
          <p>This is an automated message from ${config.app.name} contact form.</p>
          <p>© ${new Date().getFullYear()} ${config.app.name}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate HTML email template for user confirmation
 * @param {Object} data - User data
 * @returns {string} - HTML email template
 */
exports.generateUserConfirmationTemplate = ({ name, subject }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>We've Received Your Message</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .container {
          border: 1px solid #e0e0e0;
          border-radius: 5px;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 20px;
        }
        .header img {
          max-width: 150px;
          height: auto;
        }
        .content {
          margin-bottom: 30px;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #666;
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #f0f0f0;
        }
        .social-links {
          text-align: center;
          margin: 20px 0;
        }
        .social-links a {
          display: inline-block;
          margin: 0 10px;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Thank You for Contacting Us</h2>
        </div>
        
        <div class="content">
          <p>Dear ${name},</p>
          
          <p>We've received your message regarding "${subject}". Thank you for reaching out to us!</p>
          
          <p>Our team is reviewing your inquiry and will get back to you as soon as possible. Please note that our typical response time is within 24-48 business hours.</p>
          
          <p>If your matter requires immediate attention, please don't hesitate to call us at ${config.contact.phone || '[Phone Number]'}.</p>
          
          <p>
            Best regards,<br>
            The ${config.app.name} Team
          </p>
        </div>
        
        <div class="social-links">
          ${config.social.facebook ? `<a href="${config.social.facebook}">Facebook</a>` : ''}
          ${config.social.twitter ? `<a href="${config.social.twitter}">Twitter</a>` : ''}
          ${config.social.instagram ? `<a href="${config.social.instagram}">Instagram</a>` : ''}
          ${config.social.linkedin ? `<a href="${config.social.linkedin}">LinkedIn</a>` : ''}
        </div>
        
        <div class="footer">
          <p>This is an automated response. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} ${config.app.name}. All rights reserved.</p>
          <p>${config.company.address || ''}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};