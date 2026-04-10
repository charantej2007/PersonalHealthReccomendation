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
    if (error instanceof Error && error.message.includes('not configured')) {
      throw new ApiError(503, 'Email OTP service is not configured on the server. Please contact support.');
    }
    if (error?.code === 'EAUTH') {
      throw new ApiError(500, 'Email configuration error: SMTP username or app password is invalid.');
    }
    throw new ApiError(500, 'Could not send OTP email. Please try again later.');
  }
}

router.post(
  '/signup/request-otp',
  asyncHandler(async (req, res) => {
    const { email } = requestOtpSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();
    const purpose = 'signup';

    if (!isPurposeEnabled(purpose)) {
      throw new ApiError(400, 'Signup OTP is disabled in configuration');
    }

    const existingUser = await adminDb
      .collection('users')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      throw new ApiError(409, 'An account already exists for this email');
    }

    const ref = adminDb.collection('auth_otps').doc(otpDocId(normalizedEmail, purpose));
    const snap = await ref.get();

    const now = new Date();
    const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;
    const oneHourMs = 60 * 60 * 1000;
    let resendCount = 0;
    let resendWindowStartedAt = now;

    if (snap.exists) {
      const data = snap.data();
      const cooldownUntil = data?.cooldownUntil?.toDate ? data.cooldownUntil.toDate() : data?.cooldownUntil;
      if (cooldownUntil && cooldownUntil > now) {
        const secondsLeft = Math.ceil((cooldownUntil.getTime() - now.getTime()) / 1000);
        throw new ApiError(429, `Please wait ${secondsLeft}s before requesting another OTP.`);
      }

      const windowStart = data?.resendWindowStartedAt?.toDate
        ? data.resendWindowStartedAt.toDate()
        : data?.resendWindowStartedAt;
      const windowAge = windowStart ? now.getTime() - windowStart.getTime() : Number.POSITIVE_INFINITY;

      if (windowAge <= oneHourMs) {
        resendWindowStartedAt = windowStart;
        resendCount = Number(data?.resendCount ?? 0);
      }

      if (resendCount >= env.OTP_MAX_RESENDS_PER_HOUR) {
        throw new ApiError(429, 'OTP resend limit reached. Please try again after some time.');
      }
    }

    const otp = generateNumericOtp(env.OTP_LENGTH);
    const otpHash = hashOtp({ email: normalizedEmail, purpose, otp });
    const expiresAt = new Date(now.getTime() + env.OTP_EXPIRY_MINUTES * 60 * 1000);
    const cooldownUntil = new Date(now.getTime() + cooldownMs);

    await sendOtpWithErrorHandling({ email: normalizedEmail, otp, purpose });

    await ref.set(
      {
        email: normalizedEmail,
        purpose,
        otpHash,
        expiresAt,
        attempts: 0,
        resendCount: resendCount + 1,
        resendWindowStartedAt,
        cooldownUntil,
        verified: false,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: snap.exists ? (snap.data()?.createdAt ?? FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({
      ok: true,
      message: 'OTP sent successfully',
      expiresInSeconds: env.OTP_EXPIRY_MINUTES * 60,
      resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
    });
  })
);

router.post(
  '/signup/verify-otp',
  asyncHandler(async (req, res) => {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();
    const purpose = 'signup';

    const ref = adminDb.collection('auth_otps').doc(otpDocId(normalizedEmail, purpose));
    const snap = await ref.get();

    if (!snap.exists) {
      throw new ApiError(400, 'OTP was not requested for this email');
    }

    const data = snap.data();
    const now = new Date();

    const expiresAt = data?.expiresAt?.toDate ? data.expiresAt.toDate() : data?.expiresAt;
    if (!expiresAt || expiresAt < now) {
      throw new ApiError(400, 'OTP expired. Please request a new one.');
    }

    const attempts = Number(data?.attempts ?? 0);
    if (attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new ApiError(429, 'Maximum OTP verification attempts reached. Please request a new OTP.');
    }

    const expectedHash = hashOtp({ email: normalizedEmail, purpose, otp });
    if (expectedHash !== data?.otpHash) {
      await ref.update({
        attempts: attempts + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new ApiError(400, 'Invalid OTP');
    }

    await ref.update({
      verified: true,
      verifiedAt: FieldValue.serverTimestamp(),
      otpHash: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      ok: true,
      verified: true,
      message: 'Email verified successfully',
    });
  })
);

router.post(
  '/forgot-password/request-otp',
  asyncHandler(async (req, res) => {
    const { email } = requestOtpSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();
    const purpose = 'forgot-password';

    if (!isPurposeEnabled(purpose)) {
      throw new ApiError(400, 'Forgot password OTP is disabled in configuration');
    }

    const existingUserSnap = await adminDb
      .collection('users')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (existingUserSnap.empty) {
      throw new ApiError(404, 'No account found for this email');
    }

    const ref = adminDb.collection('auth_otps').doc(otpDocId(normalizedEmail, purpose));
    const snap = await ref.get();

    const now = new Date();
    const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;
    const oneHourMs = 60 * 60 * 1000;
    let resendCount = 0;
    let resendWindowStartedAt = now;

    if (snap.exists) {
      const data = snap.data();
      const cooldownUntil = data?.cooldownUntil?.toDate ? data.cooldownUntil.toDate() : data?.cooldownUntil;
      if (cooldownUntil && cooldownUntil > now) {
        const secondsLeft = Math.ceil((cooldownUntil.getTime() - now.getTime()) / 1000);
        throw new ApiError(429, `Please wait ${secondsLeft}s before requesting another OTP.`);
      }

      const windowStart = data?.resendWindowStartedAt?.toDate
        ? data.resendWindowStartedAt.toDate()
        : data?.resendWindowStartedAt;
      const windowAge = windowStart ? now.getTime() - windowStart.getTime() : Number.POSITIVE_INFINITY;

      if (windowAge <= oneHourMs) {
        resendWindowStartedAt = windowStart;
        resendCount = Number(data?.resendCount ?? 0);
      }

      if (resendCount >= env.OTP_MAX_RESENDS_PER_HOUR) {
        throw new ApiError(429, 'OTP resend limit reached. Please try again after some time.');
      }
    }

    const otp = generateNumericOtp(env.OTP_LENGTH);
    const otpHash = hashOtp({ email: normalizedEmail, purpose, otp });
    const expiresAt = new Date(now.getTime() + env.OTP_EXPIRY_MINUTES * 60 * 1000);
    const cooldownUntil = new Date(now.getTime() + cooldownMs);

    await sendOtpWithErrorHandling({ email: normalizedEmail, otp, purpose });

    await ref.set(
      {
        email: normalizedEmail,
        purpose,
        otpHash,
        expiresAt,
        attempts: 0,
        resendCount: resendCount + 1,
        resendWindowStartedAt,
        cooldownUntil,
        verified: false,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: snap.exists ? (snap.data()?.createdAt ?? FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({
      ok: true,
      message: 'OTP sent successfully',
      expiresInSeconds: env.OTP_EXPIRY_MINUTES * 60,
      resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
    });
  })
);

router.post(
  '/forgot-password/verify-otp',
  asyncHandler(async (req, res) => {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();
    const purpose = 'forgot-password';

    const ref = adminDb.collection('auth_otps').doc(otpDocId(normalizedEmail, purpose));
    const snap = await ref.get();

    if (!snap.exists) {
      throw new ApiError(400, 'OTP was not requested for this email');
    }

    const data = snap.data();
    const now = new Date();

    const expiresAt = data?.expiresAt?.toDate ? data.expiresAt.toDate() : data?.expiresAt;
    if (!expiresAt || expiresAt < now) {
      throw new ApiError(400, 'OTP expired. Please request a new one.');
    }

    const attempts = Number(data?.attempts ?? 0);
    if (attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new ApiError(429, 'Maximum OTP verification attempts reached. Please request a new OTP.');
    }

    const expectedHash = hashOtp({ email: normalizedEmail, purpose, otp });
    if (expectedHash !== data?.otpHash) {
      await ref.update({
        attempts: attempts + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new ApiError(400, 'Invalid OTP');
    }

    await ref.update({
      verified: true,
      verifiedAt: FieldValue.serverTimestamp(),
      otpHash: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      ok: true,
      verified: true,
      message: 'Email verified successfully',
    });
  })
);

router.post(
  '/forgot-password/reset-password',
  asyncHandler(async (req, res) => {
    const { email, password, confirmPassword } = resetPasswordSchema.parse(req.body);
    if (password !== confirmPassword) {
      throw new ApiError(400, 'Password and confirm password must match');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const purpose = 'forgot-password';

    const otpRef = adminDb.collection('auth_otps').doc(otpDocId(normalizedEmail, purpose));
    const otpSnap = await otpRef.get();

    if (!otpSnap.exists || !otpSnap.data()?.verified) {
      throw new ApiError(400, 'OTP verification required before resetting password');
    }

    const userSnap = await adminDb
      .collection('users')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (userSnap.empty) {
      throw new ApiError(404, 'No account found for this email');
    }

    const userDoc = userSnap.docs[0];
    const passwordHash = hashPassword(password);

    await userDoc.ref.update({
      passwordHash,
      passwordUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await otpRef.delete();

    return res.json({
      ok: true,
      message: 'Password reset successful',
    });
  })
);

export default router;
