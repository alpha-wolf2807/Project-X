/**
 * PROJECT-X — SMS Service (Twilio)
 *
 * Used for OTP delivery via SMS as fallback/primary for phone verification.
 * Gracefully degrades if Twilio is not configured.
 */

const logger = require('../utils/logger');

let twilioClient = null;

try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
} catch (err) {
  logger.warn('Twilio not initialized — SMS disabled');
}

const sendSMS = async ({ to, message }) => {
  if (!twilioClient) {
    logger.warn(`SMS skipped (Twilio not configured): ${to}`);
    return;
  }

  try {
    const formatted = to.startsWith('+') ? to : `+91${to}`;
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formatted,
    });
    logger.info(`SMS sent to ${formatted}`);
  } catch (err) {
    logger.error(`SMS failed to ${to}:`, err.message);
  }
};

const sendOTPSMS = async (phone, otp) => {
  await sendSMS({
    to: phone,
    message: `Your Project-X OTP is: ${otp}. Valid for 10 minutes. Do NOT share with anyone. -Project-X`,
  });
};

module.exports = { sendSMS, sendOTPSMS };
