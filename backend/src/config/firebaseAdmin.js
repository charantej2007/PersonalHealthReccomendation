import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from './env.js';

let startupError = null;

function unavailableProxy() {
  const throwUnavailable = () => {
    const baseMessage =
      'Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.';
    if (startupError) {
      throw new Error(`${baseMessage} Startup error: ${startupError.message}`);
    }
    throw new Error(baseMessage);
  };

  return new Proxy(
    function unavailableService() {
      const msg = `Firebase Admin is unavailable. Root cause: ${startupError?.message || 'Config missing'}`;
      console.error(`[FirebaseAdmin] CRITICAL: ${msg}`);
      throwUnavailable();
    },
    {
      get(_, prop) {
        if (prop === 'then') return undefined; // Handle async/promise checks gracefully
        console.error(`[FirebaseAdmin] Access to property "${String(prop)}" failed because SDK is not initialized.`);
        throwUnavailable();
      },
      apply() {
        throwUnavailable();
      },
    }
  );
}

let adminDb = unavailableProxy();
let adminMessaging = unavailableProxy();

if (env.FIREBASE_ADMIN_ENABLED) {
  try {
    const app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY,
        }),
        databaseURL: env.FIREBASE_DATABASE_URL,
      });

    adminDb = getFirestore(app);
    adminMessaging = getMessaging(app);
    console.log('[FirebaseAdmin] Successfully initialized Firebase Admin SDK.');
  } catch (error) {
    startupError = error instanceof Error ? error : new Error('Unknown Firebase Admin startup error');
    console.error(`[FirebaseAdmin] Initialization CRITICAL FAILURE: ${startupError.message}`);
    if (startupError.stack) console.debug(startupError.stack);
  }
} else {
  console.warn('[FirebaseAdmin] Initialization skipped: check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
}

export { adminDb, adminMessaging };
