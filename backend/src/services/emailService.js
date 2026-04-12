import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

function assertEmailOtpConfigured() {
  if (!env.EMAIL_OTP_ENABLED) {
    throw new Error('Email OTP service is not configured. Set SMTP_USER and SMTP_PASS.');
  }
}

function getNormalizedAuth() {
  return {
    user: env.SMTP_USER.trim().toLowerCase(),
    // Gmail app password is displayed with spaces, but auth expects compact value.
    pass: env.SMTP_PASS.replace(/\s+/g, ''),
  };
}

function getOtpEmailContent({ otp, expiryMinutes, purpose }) {
  if (purpose === 'forgot-password') {
    return {
      subject: 'Your Password Reset Verification Code',
      heading: 'Verify password reset',
      intro: 'Use the OTP below to reset your password:',
    };
  }

  return {
    subject: 'Your Signup Verification Code',
    heading: 'Verify your email',
    intro: 'Use the OTP below to continue your signup:',
  };
}

function getPrimaryTransport() {
  const auth = getNormalizedAuth();

  return nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    port: 465,
    auth,
  });
}

function getFallbackTransport() {
  const auth = getNormalizedAuth();

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: true,
    auth,
  });
}

export async function sendOtpEmail({ email, otp, expiryMinutes, purpose = 'signup' }) {
  assertEmailOtpConfigured();

  const from = `${env.MAIL_FROM_NAME} <${env.MAIL_FROM_ADDRESS}>`;
  const content = getOtpEmailContent({ otp, expiryMinutes, purpose });

  const payload = {
    from,
    to: email,
    subject: content.subject,
    text: `Your verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin-bottom: 8px;">${content.heading}</h2>
        <p style="margin-top: 0;">${content.intro}</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0; color: #0f766e;">
          ${otp}
        </div>
        <p>This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };

  try {
    console.log(`[EmailService] Attempting to send ${purpose} OTP to ${email} via primary transport...`);
    const transport = getPrimaryTransport();
    await transport.sendMail(payload);
    console.log(`[EmailService] OTP sent successfully to ${email}`);
  } catch (primaryError) {
    console.warn(`[EmailService] Primary transport failed for ${email}:`, primaryError.message);
    try {
      console.log(`[EmailService] Attempting fallback transport for ${email}...`);
      await getFallbackTransport().sendMail(payload);
      console.log(`[EmailService] OTP sent successfully to ${email} via fallback`);
    } catch (fallbackError) {
      console.error(`[EmailService] All email transports failed for ${email}:`, fallbackError.message);
      throw fallbackError;
    }
  }
}

// Startup diagnostic: Test SMTP connection to catch wrong passwords immediately.
if (env.EMAIL_OTP_ENABLED) {
  setTimeout(async () => {
    try {
      console.log('[EmailService] Verifying SMTP connection on startup...');
      const transport = getPrimaryTransport();
      await transport.verify();
      console.log('[EmailService] SMTP Connection Test: SUCCESS - Your email settings are correct.');
    } catch (err) {
      console.error('[EmailService] SMTP Connection Test: FAILED. Check your SMTP_USER and SMTP_PASS (App Password).');
      console.error(`[EmailService] Reason: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, 5000); // Wait 5 seconds to not interfere with main startup logs
}
