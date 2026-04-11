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
      throwUnavailable();
    },
    {
      get() {
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
  } catch (error) {
    startupError = error instanceof Error ? error : new Error('Unknown Firebase Admin startup error');
    console.error('Firebase Admin initialization failed:', startupError.message);
  }
}

export { adminDb, adminMessaging };
