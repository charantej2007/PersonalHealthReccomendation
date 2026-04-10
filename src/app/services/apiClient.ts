const configuredBaseUrl = import.meta.env.VITE_BACKEND_URL?.trim();

// In production on Vercel, default to same-origin /api unless explicitly overridden.
const API_BASE_URL = configuredBaseUrl ? configuredBaseUrl.replace(/\/+$/, '') : '';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'message' in payload
      ? String((payload as { message: string }).message)
      : 'Request failed';

    throw new ApiClientError(message, response.status, payload);
  }

  return payload as T;
}
