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

const envSchema = z.object({
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
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  MAIL_FROM_NAME: z.string().default('Personalized Health Recommendation'),
  MAIL_FROM_ADDRESS: z.string().email(),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),

  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().min(1).max(30).default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(15).max(600).default(60),
  OTP_MAX_RESENDS_PER_HOUR: z.coerce.number().int().min(1).max(20).default(5),
  OTP_PURPOSES: z.string().default('signup,forgot-password'),
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
};
