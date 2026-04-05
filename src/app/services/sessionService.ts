const USER_ID_KEY = 'phr_user_id';

export function getCurrentUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function setCurrentUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

export function clearCurrentUserId(): void {
  localStorage.removeItem(USER_ID_KEY);
}
