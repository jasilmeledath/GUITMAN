const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASS,
    },
});

const sendEmail = async (to, subject, text, html) => {
    await transporter.sendMail({
        from: `GuitMan <${process.env.EMAIL}>`,
        to,
        subject,
        text,
        html,
    });
};

module.exports = { sendEmail };