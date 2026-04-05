import { apiRequest } from './apiClient';

export type UserProfile = {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  email?: string;
  conditions?: string[];
  fcmToken?: string;
};

export type CreateUserPayload = {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  email?: string;
  conditions?: string[];
};

export type VitalPayload = {
  systolic: number;
  diastolic: number;
  sugarLevel: number;
  measuredAt?: string;
  notes?: string;
};

type UserLookupResponse = {
  user: UserProfile | null;
};

type RecommendationData = {
  bmi: number | null;
  bmiClass: string;
  vitalFlags: string[];
  exercises: string[];
  yoga: string[];
  food: string[];
  cautions: string[];
  generatedAt: string;
};

export type LatestRecommendationResponse = {
  id: string;
  userId: string;
  vitalId: string;
  recommendation: RecommendationData;
};

export type VitalsEntry = {
  id: string;
  userId: string;
  systolic: number;
  diastolic: number;
  sugarLevel: number;
  measuredAt?: string | Date | { seconds?: number; _seconds?: number; nanoseconds?: number; _nanoseconds?: number };
};

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  read?: boolean;
  dueAt?: string;
  metadata?: {
    kind?: 'food' | 'exercise' | string;
    source?: string;
    dateKey?: string;
  };
};

export async function createUserProfile(payload: CreateUserPayload): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/users', {
    method: 'POST',
    body: payload,
  });
}

export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const encoded = encodeURIComponent(email);
  const response = await apiRequest<UserLookupResponse>(`/api/users?email=${encoded}`);
  return response.user;
}

export async function findOrCreateUserByGoogle(email: string, displayName: string): Promise<UserProfile> {
  const existingUser = await findUserByEmail(email);
  if (existingUser) return existingUser;

  // Defaults are used for first Google sign-in and can be edited in profile/data screens.
  return createUserProfile({
    name: displayName,
    age: 25,
    gender: 'other',
    heightCm: 170,
    weightKg: 70,
    email,
    conditions: [],
  });
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  return apiRequest<UserProfile>(`/api/users/${userId}`);
}

export async function updateUserProfile(
  userId: string,
  payload: Partial<Omit<CreateUserPayload, 'gender'>> & { gender?: 'male' | 'female' | 'other' }
): Promise<void> {
  await apiRequest(`/api/users/${userId}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function submitDailyVitals(userId: string, payload: VitalPayload): Promise<void> {
  await apiRequest(`/api/users/${userId}/vitals`, {
    method: 'POST',
    body: payload,
  });
}

export async function getLatestRecommendation(userId: string): Promise<LatestRecommendationResponse> {
  return apiRequest<LatestRecommendationResponse>(`/api/users/${userId}/recommendations/latest`);
}

export async function getRecentVitals(userId: string): Promise<VitalsEntry | null> {
  const response = await apiRequest<{ vitals: VitalsEntry[] }>(`/api/users/${userId}/vitals?limit=1`);
  return response.vitals[0] ?? null;
}

export async function getVitalsHistory(userId: string, limit = 120): Promise<VitalsEntry[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 365);
  const response = await apiRequest<{ vitals: VitalsEntry[] }>(
    `/api/users/${userId}/vitals?limit=${safeLimit}`
  );
  return response.vitals;
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const response = await apiRequest<{ notifications: AppNotification[] }>(
    `/api/users/${userId}/notifications`
  );
  return response.notifications;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiRequest(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}
