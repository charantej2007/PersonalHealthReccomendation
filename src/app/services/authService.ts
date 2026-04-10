import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithRedirect,
  type AuthError,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

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
      return 'This localhost domain is not authorized in Firebase Auth. Add localhost in Firebase Console > Authentication > Settings > Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is disabled for this Firebase project. Enable Google provider in Firebase Console > Authentication > Sign-in method.';
    default:
      return authError?.message ?? 'Google sign-in failed.';
  }
}

export async function continueWithGoogle(): Promise<GoogleUser | null> {
  try {
    await signInWithRedirect(auth, provider);
    return null;
  } catch (error) {
    throw new Error(toGoogleAuthErrorMessage(error));
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
