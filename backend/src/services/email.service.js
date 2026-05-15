/**
 * CARTEX — Email Service (Nodemailer + HTML Templates)
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const templates = {
  email_verify: (data) => ({
    subject: '🎉 Verify Your CARTEX Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #fff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px;">CARTEX</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">Hyperlocal Hostel Commerce</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #f97316; margin-top: 0;">Welcome, ${data.name}! 🚀</h2>
          <p style="color: #ccc; line-height: 1.6;">Your one-stop shop for everything hostel-life needs. Verify your email to get started.</p>
          <div style="background: #1a1a1a; border: 2px solid #f97316; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
            <p style="margin: 0 0 8px; color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your OTP</p>
            <h1 style="margin: 0; font-size: 48px; font-weight: 900; color: #f97316; letter-spacing: 12px;">${data.otp}</h1>
            <p style="margin: 16px 0 0; color: #666; font-size: 13px;">Valid for 10 minutes only</p>
          </div>
          <p style="color: #888; font-size: 13px;">If you didn't create an account, ignore this email.</p>
        </div>
        <div style="background: #1a1a1a; padding: 20px; text-align: center;">
          <p style="margin: 0; color: #555; font-size: 12px;">© 2024 CARTEX. Built with ❤️ for hostellers.</p>
        </div>
      </div>
    `,
  }),

  password_reset: (data) => ({
    subject: '🔐 CARTEX Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #fff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 900;">CARTEX</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #f97316; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #ccc;">Hi ${data.name}, use this OTP to reset your password:</p>
          <div style="background: #1a1a1a; border: 2px solid #ef4444; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
            <h1 style="margin: 0; font-size: 48px; font-weight: 900; color: #ef4444; letter-spacing: 12px;">${data.otp}</h1>
            <p style="margin: 16px 0 0; color: #666; font-size: 13px;">Valid for 10 minutes. Do not share this OTP with anyone.</p>
          </div>
        </div>
      </div>
    `,
  }),

  order_confirmed: (data) => ({
    subject: `✅ Order #${data.orderNumber} Confirmed!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #fff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 40px; text-align: center;">
          <h1 style="margin: 0;">Order Confirmed! ✅</h1>
        </div>
        <div style="padding: 40px;">
          <p style="color: #ccc;">Hi ${data.name}, your order is confirmed.</p>
          <div style="background: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #888;">Order Number</p>
            <h2 style="margin: 4px 0; color: #22c55e;">#${data.orderNumber}</h2>
            <p style="margin: 16px 0 4px; color: #888;">Delivery OTP</p>
            <h2 style="margin: 0; color: #f97316; letter-spacing: 8px;">${data.deliveryOTP}</h2>
            <p style="color: #666; font-size: 12px; margin: 8px 0 0;">Share this with the delivery dude on delivery</p>
          </div>
          <p style="color: #888; font-size: 13px;">Total: ₹${data.totalAmount}</p>
        </div>
      </div>
    `,
  }),
};

const sendEmail = async ({ to, subject, template, data, html }) => {
  try {
    const templateContent = templates[template]?.(data);
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject: templateContent?.subject || subject,
      html: templateContent?.html || html,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to} [${template || 'custom'}]`);
  } catch (err) {
    // Email failure should never crash the app
    logger.error(`Email failed to ${to}:`, err.message);
  }
};

module.exports = { sendEmail };

