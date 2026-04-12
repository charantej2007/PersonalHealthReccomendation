import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  indexedDBLocalPersistence,
  initializeAuth,
  type AuthError,
} from 'firebase/auth';
import { Browser } from '@capacitor/browser';
import { auth } from '../lib/firebase';

// Helper to check if we are on Capacitor
const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;

export type GoogleUser = {
  email: string;
  displayName: string;
};

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});

function toGoogleUser(email: string | null, displayName: string | null): GoogleUser {
  if (!email) {
    throw new Error('Google account email is required.');
  }

  return {
    email,
    displayName: displayName ?? 'Google User',
  };
}

function toGoogleAuthErrorMessage(error: unknown): string {
  const authError = error as Partial<AuthError>;
  switch (authError?.code) {
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Auth. Add your deployed domain in Firebase Console > Authentication > Settings > Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is disabled for this Firebase project. Enable Google provider in Firebase Console > Authentication > Sign-in method.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled before completion.';
    default:
      return authError?.message ?? 'Google sign-in failed.';
  }
}

export async function continueWithGoogle(): Promise<GoogleUser | null> {
  try {
    if (isCapacitor) {
      console.log('[AuthService] Mobile detected. Opening Vercel Auth Bridge...');
      // IMPORTANT: Use the deployed Vercel URL, not localhost
      const productionUrl = 'https://personal-health-reccomendation.vercel.app/auth/mobile-bridge';
      await Browser.open({ url: productionUrl });
      return null;
    }

    console.log('[AuthService] Attempting Google Sign-in with Popup...');
    const popupResult = await signInWithPopup(auth, provider);
    console.log('[AuthService] Popup success for:', popupResult.user.email);
    return toGoogleUser(popupResult.user.email, popupResult.user.displayName);
  } catch (popupError) {
    const authError = popupError as Partial<AuthError>;
    console.warn('[AuthService] Sign-in flow error. Code:', authError.code);

    const fallbackToRedirectCodes = new Set([
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
    ]);

    if (!isCapacitor && (!authError.code || !fallbackToRedirectCodes.has(authError.code))) {
      throw new Error(toGoogleAuthErrorMessage(popupError));
    }

    console.log('[AuthService] Ensuring redirect logic is active...');
    await signInWithRedirect(auth, provider);
    return null;
  }
}

export async function getGoogleRedirectUser(): Promise<GoogleUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) {
      // Some browsers restore session without returning a redirect result object.
      const currentUser = auth.currentUser;
      if (!currentUser) return null;

      return toGoogleUser(currentUser.email, currentUser.displayName);
    }

    return toGoogleUser(result.user.email, result.user.displayName);
  } catch (error) {
    throw new Error(toGoogleAuthErrorMessage(error));
  }
}

export async function signOutGoogleSession(): Promise<void> {
  await signOut(auth);
}
