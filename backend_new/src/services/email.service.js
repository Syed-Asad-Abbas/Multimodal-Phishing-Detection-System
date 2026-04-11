const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT || 587,
    secure: EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

const sendMail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Phishing Detection Support" <${EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        logger.info(`[Email Service] Sent: ${info.messageId} to ${to}`);
        return { success: true, message: "Email sent", info };
    } catch (error) {
        logger.error(`[Email Service] Error sending email: ${error.message}`);
        return { success: false, message: "Failed to send email", error: error.message };
    }
};

module.exports = {
    sendMail
};
