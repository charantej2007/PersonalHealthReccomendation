const configuredBaseUrl = import.meta.env.VITE_BACKEND_URL?.trim();

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolveBackendBaseUrl(rawValue: string | undefined): string {
  if (!rawValue) return '';

  const candidates = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (candidates.length === 0) return '';
  if (candidates.length === 1) return candidates[0].replace(/\/+$/, '');

  const parsedCandidates = candidates
    .map((value) => {
      try {
        return { value, url: new URL(value) };
      } catch {
        return null;
      }
    })
    .filter((item): item is { value: string; url: URL } => Boolean(item));

  if (parsedCandidates.length === 0) {
    return candidates[0].replace(/\/+$/, '');
  }

  const runningOnLocalhost =
    typeof window !== 'undefined' && isLocalHost(window.location.hostname);

  const preferred = runningOnLocalhost
    ? parsedCandidates.find((candidate) => isLocalHost(candidate.url.hostname))
    : parsedCandidates.find((candidate) => !isLocalHost(candidate.url.hostname));

  return (preferred?.value ?? parsedCandidates[0].value).replace(/\/+$/, '');
}

// In production on Vercel, default to same-origin /api unless explicitly overridden.
const API_BASE_URL = resolveBackendBaseUrl(configuredBaseUrl);

// Logic to prevent 404 loops in production if VITE_BACKEND_URL is missing.
const isProduction = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1';

if (isProduction && (!API_BASE_URL || API_BASE_URL.startsWith('/'))) {
  console.error(
    'CRITICAL: VITE_BACKEND_URL is missing or invalid in production production environment. ' +
    'API calls will fail. Check your Vercel Environment Variables.'
  );
}

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
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const message = isLocalhost
      ? 'Could not reach the local backend. Make sure your server is running on port 8080.'
      : `Could not reach the backend service at "${API_BASE_URL}". Please ensure VITE_BACKEND_URL is set correctly in your Vercel environment variables.`;
    
    throw new ApiClientError(message, 0, err);
  }

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'message' in payload
      ? String((payload as { message: string }).message)
      : 'Request failed';

    const normalizedMessage =
      response.status >= 500
        ? `${message} (Server error ${response.status}. Backend may be misconfigured.)`
        : message;

    throw new ApiClientError(normalizedMessage, response.status, payload);
  }

  return payload as T;
}
