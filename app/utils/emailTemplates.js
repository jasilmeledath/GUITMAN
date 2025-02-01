const generateSignupEmail = (first_name, otp) => {
    return {
        subject: "Action Required: Verify Your Email to Join the GuitMan Community 🎸",
        text: `Hi ${first_name},

Welcome to GuitMan, the ultimate destination for guitar enthusiasts! 🎶

To complete your registration and unlock all the amazing features GuitMan has to offer, please verify your email address by using the One-Time Password (OTP) below:

🎟️ Your OTP Code: ${otp}

⚠️ This code is valid for the next 1 minute. Please do not share it with anyone for security purposes. 

If you did not sign up for GuitMan, kindly ignore this email.

Need assistance? We're here to help! Feel free to contact our support team at any time.

Thank you for joining our vibrant community of guitar lovers. We’re thrilled to have you onboard!

Rock on! 🤘  
The GuitMan Team  
        `,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Welcome to GuitMan, ${first_name}! 🎸</h2>
            <p>Thank you for signing up with <strong>GuitMan</strong>, the ultimate destination for guitar enthusiasts!</p>
            <p>To complete your registration and unlock all the amazing features we offer, please verify your email address by using the One-Time Password (OTP) below:</p>
            <p style="font-size: 1.5em; font-weight: bold; color: #4CAF50;">🎟️ Your OTP Code: <span style="color: #000;">${otp}</span></p>
            <p><strong>⚠️ Note:</strong> This code is valid for the next <strong>1 minute</strong>. For your security, please do not share this code with anyone.</p>
            <hr>
            <p>If you didn’t sign up for GuitMan, you can safely ignore this email.</p>
            <p>Need help? Feel free to <a href="mailto:${process.env.EMAIL}" style="color: #4CAF50; text-decoration: none;">contact us</a>. We're here for you!</p>
            <p style="margin-top: 20px;">Thank you for joining our vibrant community of guitar lovers. We're thrilled to have you onboard!</p>
            <p style="font-size: 1.2em; font-weight: bold;">Rock on! 🤘</p>
            <p style="color: #4CAF50;">- The GuitMan Team</p>
        </div>`
    };
};

const generateResendOtpEmail = (first_name, otp) => {
    return {
        subject: "Resend OTP - GuitMan Email Verification",
        text: `Hello ${first_name},

Your new OTP code is ${otp}. This code is valid for 10 minutes.

Thank you for choosing GuitMan!

Best regards,
The GuitMan Team`,
    };
};

module.exports = { generateSignupEmail, generateResendOtpEmail };