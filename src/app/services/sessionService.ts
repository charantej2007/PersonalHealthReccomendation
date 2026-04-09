const USER_ID_KEY = 'phr_user_id';
const PROFILE_UPDATED_AT_KEY = 'phr_profile_updated_at';
const PROFILE_UPDATED_EVENT = 'phr-profile-updated';

export function getCurrentUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function setCurrentUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

export function clearCurrentUserId(): void {
  localStorage.removeItem(USER_ID_KEY);
}

export function markProfileUpdated(): void {
  const stamp = String(Date.now());
  localStorage.setItem(PROFILE_UPDATED_AT_KEY, stamp);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: stamp }));
  }
}

export function subscribeProfileUpdates(onProfileUpdated: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleCustomEvent = () => onProfileUpdated();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === PROFILE_UPDATED_AT_KEY) {
      onProfileUpdated();
    }
  };

  window.addEventListener(PROFILE_UPDATED_EVENT, handleCustomEvent as EventListener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(PROFILE_UPDATED_EVENT, handleCustomEvent as EventListener);
    window.removeEventListener('storage', handleStorage);
  };
}
