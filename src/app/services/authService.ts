import { GoogleAuthProvider, getRedirectResult, signInWithRedirect } from 'firebase/auth';
import { auth } from '../lib/firebase';

export type GoogleUser = {
  email: string;
  displayName: string;
};

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});

export async function continueWithGoogle(): Promise<void> {
  await signInWithRedirect(auth, provider);
}

export async function getGoogleRedirectUser(): Promise<GoogleUser | null> {
  const result = await getRedirectResult(auth);
  if (!result) return null;

  const firebaseUser = result.user;
  if (!firebaseUser.email) {
    throw new Error('Google account email is required.');
  }

  return {
    email: firebaseUser.email,
    displayName: firebaseUser.displayName ?? 'Google User',
  };
}
