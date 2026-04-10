import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '.env.backend' });

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
}, z.boolean());

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    BACKEND_PORT: z.coerce.number().default(8080),
    FIREBASE_PROJECT_ID: z.string().min(1),
    FIREBASE_CLIENT_EMAIL: z.string().min(1),
    FIREBASE_PRIVATE_KEY: z.string().min(1),
    FIREBASE_DATABASE_URL: z.string().url().optional(),

    MAIL_PROVIDER: z.enum(['smtp']).default('smtp'),
    SMTP_HOST: z.string().min(1).default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_SECURE: envBoolean.default(false),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    MAIL_FROM_NAME: z.string().default('Personalized Health Recommendation'),
    MAIL_FROM_ADDRESS: z.string().email().optional(),
    APP_BASE_URL: z.string().url().default('http://localhost:5173'),

    OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
    OTP_EXPIRY_MINUTES: z.coerce.number().int().min(1).max(30).default(10),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(15).max(600).default(60),
    OTP_MAX_RESENDS_PER_HOUR: z.coerce.number().int().min(1).max(20).default(5),
    OTP_PURPOSES: z.string().default('signup,forgot-password'),
  })
  .superRefine((values, ctx) => {
    const hasAnyMailConfig = Boolean(values.SMTP_USER || values.SMTP_PASS || values.MAIL_FROM_ADDRESS);
    const hasCompleteMailConfig = Boolean(values.SMTP_USER && values.SMTP_PASS && values.MAIL_FROM_ADDRESS);

    if (hasAnyMailConfig && !hasCompleteMailConfig) {
      if (!values.SMTP_USER) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_USER'], message: 'SMTP_USER is required when email OTP is configured.' });
      }
      if (!values.SMTP_PASS) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_PASS'], message: 'SMTP_PASS is required when email OTP is configured.' });
      }
      if (!values.MAIL_FROM_ADDRESS) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['MAIL_FROM_ADDRESS'], message: 'MAIL_FROM_ADDRESS is required when email OTP is configured.' });
      }
    }
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid backend environment configuration.');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...result.data,
  FIREBASE_PRIVATE_KEY: result.data.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  EMAIL_OTP_ENABLED: Boolean(result.data.SMTP_USER && result.data.SMTP_PASS && result.data.MAIL_FROM_ADDRESS),
};

if (!env.EMAIL_OTP_ENABLED) {
  console.warn('Email OTP is disabled. Set SMTP_USER, SMTP_PASS, and MAIL_FROM_ADDRESS to enable OTP email delivery.');
}
