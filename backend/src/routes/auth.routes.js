import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../config/firebaseAdmin.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/errors.js';
import { sendOtpEmail } from '../services/emailService.js';

const router = Router();

const requestOtpSchema = z.object({
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d+$/).min(4).max(8),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

function otpDocId(email, purpose) {
  return `${purpose}:${email.trim().toLowerCase()}`;
}

function hashOtp({ email, purpose, otp }) {
  return crypto
    .createHash('sha256')
    .update(`${email.trim().toLowerCase()}|${purpose}|${otp}`)
    .digest('hex');
}

function generateNumericOtp(length) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i += 1) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

function isPurposeEnabled(purpose) {
  const purposeSet = new Set(
    env.OTP_PURPOSES.split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

  return purposeSet.has(purpose);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

async function sendOtpWithErrorHandling({ email, otp, purpose }) {
  try {
    await sendOtpEmail({
      email,
      otp,
      expiryMinutes: env.OTP_EXPIRY_MINUTES,
      purpose,
    });
  } catch (error) {
    console.error(`[AuthRoutes] Failed to send OTP email to ${email}:`, error);
    
    if (error instanceof Error && error.message.includes('not configured')) {
      throw new ApiError(503, 'Email OTP service is not configured on the server. Please contact support.');
    }
    if (error?.code === 'EAUTH') {
      throw new ApiError(500, 'Email configuration error: SMTP username or app password is invalid.');
    }
    throw new ApiError(500, `Could not send OTP email: ${error instanceof Error ? error.message : 'Internal error'}`);
  }
}

/* 
router.post(
  '/signup/request-otp',
...
    return res.json({
      ok: true,
      message: 'Password reset successful',
    });
  })
);
*/

export default router;
