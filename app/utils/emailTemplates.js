const generateSignupEmail = (first_name, otp) => {
  const validityMinutes = 3;
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@guitman.com';

  return {
    subject: "Verify Your Email Address - GuitMan",
    text: `Dear ${first_name},

Welcome to GuitMan - Your Premier Guitar Community!

To ensure the security of your account and complete your registration, please verify your email address using the following One-Time Password (OTP):

Your Verification Code: ${otp}

Important Security Information:
• This code will expire in ${validityMinutes} minutes
• It can only be used once
• Never share this code with anyone
• Our team will never ask for this code

If you did not attempt to create an account with GuitMan, please disregard this email and contact our support team at ${supportEmail}.

What's Next?
Once verified, you'll gain access to:
• Expert guitar tutorials and lessons
• Exclusive community forums
• Gear reviews and recommendations
• Special member-only events

Need assistance? Our support team is available 24/7 at ${supportEmail}.

Thank you for choosing GuitMan. We look forward to helping you on your musical journey.

Best regards,
The GuitMan Team

This is an automated message. Please do not reply directly to this email.`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to GuitMan</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
            <h1 style="color: #2C3E50; margin: 0; font-size: 24px;">Welcome to GuitMan</h1>
            <p style="color: #7F8C8D; margin: 10px 0 0;">Your Premier Guitar Community</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 30px 0;">
            <p style="margin-bottom: 20px;">Dear ${first_name},</p>
            
            <p>Thank you for joining GuitMan. To complete your registration and secure your account, please verify your email address using the verification code below:</p>
            
            <!-- OTP Section -->
            <div style="background-color: #F8F9FA; border-radius: 6px; padding: 20px; margin: 25px 0; text-align: center;">
                <p style="font-size: 14px; color: #666; margin: 0 0 10px;">Your Verification Code:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2C3E50; font-family: monospace;">
                    ${otp}
                </div>
                <p style="font-size: 13px; color: #666; margin: 10px 0 0;">
                    This code will expire in ${validityMinutes} minutes
                </p>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #FFF3E0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #E65100;">
                    <strong>Security Notice:</strong><br>
                    • Never share this code with anyone<br>
                    • GuitMan will never ask for this code via email or phone<br>
                    • If you didn't request this code, please ignore this email
                </p>
            </div>

            <!-- Features Section -->
            <div style="margin: 30px 0;">
                <h3 style="color: #2C3E50; font-size: 18px;">What's Next?</h3>
                <p>Once verified, you'll unlock access to:</p>
                <ul style="color: #555; padding-left: 20px;">
                    <li>Expert guitar tutorials and lessons</li>
                    <li>Exclusive community forums</li>
                    <li>Gear reviews and recommendations</li>
                    <li>Special member-only events</li>
                </ul>
            </div>

            <!-- Support Section -->
            <div style="margin: 30px 0; text-align: center;">
                <p style="color: #666;">Need help? Our support team is here for you:</p>
                <a href="mailto:${supportEmail}" style="color: #3498DB; text-decoration: none;">${supportEmail}</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #999; font-size: 12px;">
            <p>This is an automated message. Please do not reply directly to this email.</p>
            <p style="margin-top: 10px;">
                &copy; ${new Date().getFullYear()} GuitMan. All rights reserved.<br>
                [Company Address]
            </p>
        </div>
    </div>
</body>
</html>`
  };
};
const generateUpdatedEmailOtp = (first_name, otp) => {
  const validityMinutes = 3;
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@guitman.com';

  return {
    subject: "Verify Your Updated Email Address - GuitMan",
    text: `Dear ${first_name},
  
  We received a request to update the email address associated with your GuitMan account.
  
  To complete this update and secure your account, please verify your new email address using the following One-Time Password (OTP):
  
  Your Verification Code: ${otp}
  
  Important Information:
  • This code will expire in ${validityMinutes} minutes.
  • It can only be used once.
  • Do not share this code with anyone.
  • GuitMan will never ask for this code.
  
  If you did not request this change, please contact our support immediately at ${supportEmail}.
  
  Thank you for choosing GuitMan.
  
  Best regards,
  The GuitMan Team
  
  This is an automated message. Please do not reply directly to this email.`,
    html: `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Updated Email Address</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
        <h1 style="color: #2C3E50; margin: 0; font-size: 24px;">Verify Your Updated Email Address</h1>
        <p style="color: #7F8C8D; margin: 10px 0 0;">GuitMan Account Update</p>
      </div>
  
      <!-- Main Content -->
      <div style="padding: 30px 0;">
        <p style="margin-bottom: 20px;">Dear ${first_name},</p>
        
        <p>We received a request to update the email address associated with your GuitMan account. To secure your account and complete this update, please verify your new email address by entering the verification code below:</p>
        
        <!-- OTP Section -->
        <div style="background-color: #F8F9FA; border-radius: 6px; padding: 20px; margin: 25px 0; text-align: center;">
          <p style="font-size: 14px; color: #666; margin: 0 0 10px;">Your Verification Code:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2C3E50; font-family: monospace;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #666; margin: 10px 0 0;">
            This code will expire in ${validityMinutes} minutes.
          </p>
        </div>
  
        <!-- Security Notice -->
        <div style="background-color: #FFF3E0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #E65100;">
            <strong>Important:</strong><br>
            • Do not share this code with anyone<br>
            • GuitMan will never ask for this code<br>
            • If you did not request this update, please contact support immediately
          </p>
        </div>
  
        <!-- Support Section -->
        <div style="margin: 30px 0; text-align: center;">
          <p style="color: #666;">Need help? Contact our support team:</p>
          <a href="mailto:${supportEmail}" style="color: #3498DB; text-decoration: none;">${supportEmail}</a>
        </div>
      </div>
  
      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #999; font-size: 12px;">
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p style="margin-top: 10px;">
          &copy; ${new Date().getFullYear()} GuitMan. All rights reserved.<br>
          [Company Address]
        </p>
      </div>
    </div>
  </body>
  </html>
  `
  };
};

/**
 * Generates the "Forgot Password" OTP email for verifying a user's identity.
 *
 * @param {string} first_name - The user's first name
 * @param {string} otp - The one-time password to include in the email
 * @returns {object} An object with `subject`, `text`, and `html` fields
 */
const generateForgotPasswordEmail = (first_name, otp) => {
  const validityMinutes = 3;
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@guitman.com';

  return {
    subject: "Reset Your GuitMan Password",
    text: `Dear ${first_name},

We received a request to reset your GuitMan password. To proceed, please use the following One-Time Password (OTP):

Your Verification Code: ${otp}

Important Security Information:
• This code will expire in ${validityMinutes} minutes
• It can only be used once
• Never share this code with anyone
• Our team will never ask for this code

If you did not request a password reset or you believe this is a mistake, please disregard this email and contact our support team at ${supportEmail}.

Need assistance? Our support team is available 24/7 at ${supportEmail}.

Best regards,
The GuitMan Team

This is an automated message. Please do not reply directly to this email.
`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your GuitMan Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
            <h1 style="color: #2C3E50; margin: 0; font-size: 24px;">Reset Your GuitMan Password</h1>
            <p style="color: #7F8C8D; margin: 10px 0 0;">We’re here to help you get back into your account</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 30px 0;">
            <p style="margin-bottom: 20px;">Dear ${first_name},</p>
            
            <p>We received a request to reset your GuitMan password. To continue with the process, please verify your identity by using the One-Time Password (OTP) below:</p>
            
            <!-- OTP Section -->
            <div style="background-color: #F8F9FA; border-radius: 6px; padding: 20px; margin: 25px 0; text-align: center;">
                <p style="font-size: 14px; color: #666; margin: 0 0 10px;">Your Verification Code:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2C3E50; font-family: monospace;">
                    ${otp}
                </div>
                <p style="font-size: 13px; color: #666; margin: 10px 0 0;">
                    This code will expire in ${validityMinutes} minutes
                </p>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #FFF3E0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #E65100;">
                    <strong>Security Notice:</strong><br>
                    • Never share this code with anyone<br>
                    • GuitMan will never ask for this code via email or phone<br>
                    • If you didn't request this code, please ignore this email
                </p>
            </div>

            <p>If you did not request a password reset or you believe this is a mistake, please disregard this email or contact our support team at:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="mailto:${supportEmail}" style="color: #3498DB; text-decoration: none;">${supportEmail}</a>
            </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #999; font-size: 12px;">
            <p>This is an automated message. Please do not reply directly to this email.</p>
            <p style="margin-top: 10px;">
                &copy; ${new Date().getFullYear()} GuitMan. All rights reserved.<br>
                [Company Address]
            </p>
        </div>
    </div>
</body>
</html>
`
  };
};

const generateOrderConfirmationEmail = (first_name, orderId, orderTotal, deliveryDate) => {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@guitman.com';
  return {
    subject: "Order Confirmation - GuitMan",
    text: `Dear ${first_name},

Thank you for your order!

Your Order ID: ${orderId}
Order Total: ₹${orderTotal.toLocaleString('en-IN')}
Estimated Delivery Date: ${deliveryDate.toDateString()}

If you have any questions, please contact our support team at ${supportEmail}.

Best regards,
The GuitMan Team

This is an automated message. Please do not reply directly to this email.`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - GuitMan</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI', Arial, sans-serif; background-color:#f9f9f9;">
  <div style="max-width:600px; margin:0 auto; padding:20px; background-color:#ffffff; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align:center; padding:20px 0; border-bottom:2px solid #f0f0f0;">
      <h1 style="margin:0; color:#2C3E50; font-size:24px;">Order Confirmation</h1>
      <p style="color:#7F8C8D; margin:10px 0 0;">Thank you for shopping with GuitMan</p>
    </div>
    <!-- Main Content -->
    <div style="padding:30px 0;">
      <p>Dear ${first_name},</p>
      <p>Your order has been successfully placed. Here are your order details:</p>
      <ul style="color:#333333; line-height:1.6;">
        <li><strong>Order ID:</strong> ${orderId}</li>
        <li><strong>Order Total:</strong> ₹${orderTotal.toLocaleString('en-IN')}</li>
        <li><strong>Estimated Delivery:</strong> ${deliveryDate.toDateString()}</li>
      </ul>
      <p>If you have any questions, please contact our support team at <a href="mailto:${supportEmail}" style="color:#3498DB; text-decoration:none;">${supportEmail}</a>.</p>
      <p>We appreciate your business and hope you enjoy your purchase.</p>
    </div>
    <!-- Footer -->
    <div style="text-align:center; padding-top:20px; border-top:2px solid #f0f0f0; color:#999; font-size:12px;">
      <p>This is an automated message. Please do not reply directly to this email.</p>
      <p style="margin-top:10px;">&copy; ${new Date().getFullYear()} GuitMan. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`
  };
};

const generateOrderCancellationEmail = (first_name, orderId, cancellationReason) => {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@guitman.com';
  return {
    subject: "Order Cancellation - GuitMan",
    text: `Dear ${first_name},

We regret to inform you that your order (ID: ${orderId}) has been cancelled.

Reason for Cancellation:
${cancellationReason}

If you have any questions or need further assistance, please contact our support team at ${supportEmail}.

Best regards,
The GuitMan Team

This is an automated message. Please do not reply directly to this email.`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Cancellation - GuitMan</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI', Arial, sans-serif; background-color:#f9f9f9;">
  <div style="max-width:600px; margin:0 auto; padding:20px; background-color:#ffffff; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align:center; padding:20px 0; border-bottom:2px solid #f0f0f0;">
      <h1 style="margin:0; color:#2C3E50; font-size:24px;">Order Cancellation</h1>
      <p style="color:#7F8C8D; margin:10px 0 0;">We're sorry to inform you</p>
    </div>
    <!-- Main Content -->
    <div style="padding:30px 0;">
      <p>Dear ${first_name},</p>
      <p>Your order (ID: ${orderId}) has been cancelled.</p>
      <p><strong>Reason for Cancellation:</strong></p>
      <p style="color:#333333;">${cancellationReason}</p>
      <p>If you have any questions, please contact our support team at <a href="mailto:${supportEmail}" style="color:#3498DB; text-decoration:none;">${supportEmail}</a>.</p>
      <p>Thank you for considering GuitMan.</p>
    </div>
    <!-- Footer -->
    <div style="text-align:center; padding-top:20px; border-top:2px solid #f0f0f0; color:#999; font-size:12px;">
      <p>This is an automated message. Please do not reply directly to this email.</p>
      <p style="margin-top:10px;">&copy; ${new Date().getFullYear()} GuitMan. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`
  };
};

const generateOrderReturnEmail = (first_name, orderId, returnStatus, additionalMessage) => {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@guitman.com';
  return {
    subject: "Order Return Update - GuitMan",
    text: `Dear ${first_name},

Your return request for order (ID: ${orderId}) has been processed.
Return Status: ${returnStatus}

${additionalMessage ? additionalMessage + "\n\n" : ""}If you have any questions, please contact our support team at ${supportEmail}.

Best regards,
The GuitMan Team

This is an automated message. Please do not reply directly to this email.`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Return Update - GuitMan</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI', Arial, sans-serif; background-color:#f9f9f9;">
  <div style="max-width:600px; margin:0 auto; padding:20px; background-color:#ffffff; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align:center; padding:20px 0; border-bottom:2px solid #f0f0f0;">
      <h1 style="margin:0; color:#2C3E50; font-size:24px;">Order Return Update</h1>
      <p style="color:#7F8C8D; margin:10px 0 0;">Your return request status</p>
    </div>
    <!-- Main Content -->
    <div style="padding:30px 0;">
      <p>Dear ${first_name},</p>
      <p>Your return request for order (ID: ${orderId}) has been processed.</p>
      <p><strong>Return Status:</strong> ${returnStatus}</p>
      ${additionalMessage ? `<p style="color:#333;">${additionalMessage}</p>` : ""}
      <p>If you have any questions, please contact our support team at <a href="mailto:${supportEmail}" style="color:#3498DB; text-decoration:none;">${supportEmail}</a>.</p>
      <p>Thank you for shopping with GuitMan.</p>
    </div>
    <!-- Footer -->
    <div style="text-align:center; padding-top:20px; border-top:2px solid #f0f0f0; color:#999; font-size:12px;">
      <p>This is an automated message. Please do not reply directly to this email.</p>
      <p style="margin-top:10px;">&copy; ${new Date().getFullYear()} GuitMan. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`
  };
};


module.exports = { 
  generateOrderConfirmationEmail,
  generateOrderCancellationEmail, 
  generateOrderReturnEmail, 
  generateSignupEmail, 
  generateUpdatedEmailOtp, 
  generateForgotPasswordEmail };