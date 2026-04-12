import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '.env.backend' });
dotenv.config();

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
}, z.boolean());

const envUrl = z.preprocess((value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Allow host-only values from deployment dashboards by assuming HTTPS.
  return `https://${trimmed}`;
}, z.string().url());

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    BACKEND_PORT: z.coerce.number().default(8080),
    FIREBASE_PROJECT_ID: z.string().min(1).optional(),
    FIREBASE_CLIENT_EMAIL: z.string().min(1).optional(),
    FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
    FIREBASE_DATABASE_URL: envUrl.optional(),

    MAIL_PROVIDER: z.enum(['smtp']).default('smtp'),
    SMTP_HOST: z.string().min(1).default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_SECURE: envBoolean.default(false),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    MAIL_FROM_NAME: z.string().default('Personalized Health Recommendation'),
    MAIL_FROM_ADDRESS: z.string().email().optional(),
    APP_BASE_URL: envUrl.default('https://personal-health-reccomendation.vercel.app'),

    OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
    OTP_EXPIRY_MINUTES: z.coerce.number().int().min(1).max(30).default(10),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(15).max(600).default(60),
    OTP_MAX_RESENDS_PER_HOUR: z.coerce.number().int().min(1).max(20).default(5),
    OTP_PURPOSES: z.string().default('signup,forgot-password'),
    DEBUG_MODE: envBoolean.default(false),
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

// Robust function to clean Firebase Private Key from common deployment mangling.
function cleanFirebaseKey(key) {
  if (!key) return undefined;
  let cleaned = key.trim();
  
  // Remove surrounding quotes if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  
  // Replace escaped newlines with actual newlines
  cleaned = cleaned.replace(/\\n/g, '\n');

  // Handle keys pasted as a single line (missing actual newlines)
  if (cleaned.includes('-----BEGIN PRIVATE KEY-----') && !cleaned.includes('\n')) {
    cleaned = cleaned
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
    
    // Attempt to break up the long base64 string every 64 characters if it's still missing newlines in the middle
    const header = '-----BEGIN PRIVATE KEY-----\n';
    const footer = '\n-----END PRIVATE KEY-----';
    if (cleaned.startsWith(header) && cleaned.endsWith(footer)) {
       const body = cleaned.substring(header.length, cleaned.length - footer.length).replace(/\s+/g, '');
       const lines = body.match(/.{1,64}/g) || [];
       cleaned = header + lines.join('\n') + footer;
    }
  }

  // Print a fingerprint to logs for verification (DO NOT LOG THE WHOLE KEY)
  const escaped = cleaned.replace(/\n/g, '\\n');
  const fingerprint = escaped.length > 50 
    ? `${escaped.substring(0, 30)}...${escaped.substring(escaped.length - 20)}` 
    : escaped;
  console.log(`[EnvConfig] Firebase Private Key Fingerprint (len=${cleaned.length}): ${fingerprint}`);
  
  return cleaned;
}

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const fieldErrors = result.error.flatten().fieldErrors;
  console.error('Invalid backend environment configuration.');
  console.error(fieldErrors);

  throw new Error(`Invalid backend environment configuration: ${JSON.stringify(fieldErrors)}`);
}

const mailFromAddress = result.data.MAIL_FROM_ADDRESS || result.data.SMTP_USER;
const firebaseAdminEnabled = Boolean(
  result.data.FIREBASE_PROJECT_ID && result.data.FIREBASE_CLIENT_EMAIL && result.data.FIREBASE_PRIVATE_KEY
);

export const env = {
  ...result.data,
  FIREBASE_PRIVATE_KEY: cleanFirebaseKey(result.data.FIREBASE_PRIVATE_KEY),
  MAIL_FROM_ADDRESS: mailFromAddress,
  FIREBASE_ADMIN_ENABLED: firebaseAdminEnabled,
  EMAIL_OTP_ENABLED: Boolean(result.data.SMTP_USER && result.data.SMTP_PASS),
};

if (!env.EMAIL_OTP_ENABLED) {
  console.warn('Email OTP is disabled. Set SMTP_USER and SMTP_PASS to enable OTP email delivery.');
}

if (!env.FIREBASE_ADMIN_ENABLED) {
  console.warn('Firebase Admin is disabled. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
}
