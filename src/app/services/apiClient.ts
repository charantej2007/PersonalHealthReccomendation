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
    typeof window !== 'undefined' && 
    isLocalHost(window.location.hostname) && 
    !isCapacitor; // In Capacitor, window.location is localhost, but we usually want the remote backend.

  const preferred = runningOnLocalhost
    ? parsedCandidates.find((candidate) => isLocalHost(candidate.url.hostname))
    : parsedCandidates.find((candidate) => !isLocalHost(candidate.url.hostname));

  return (preferred?.value ?? parsedCandidates[0].value).replace(/\/+$/, '');
}

// Logic to detect if we are running inside a Capacitor native app wrapper.
const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;

// Forced environment flag from .env files
const isProductionEnv = import.meta.env.VITE_APP_ENV === 'production';

// Logic to prevent 404 loops in production if VITE_BACKEND_URL is missing.
// We consider it "production" if:
// 1. It's a Capacitor app (Android/iOS always needs remote backend)
// 2. The hostname is NOT localhost (Vercel deployment)
// 3. The build was specifically marked as production
const isProduction = isProductionEnv || isCapacitor || (typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1');

// Safety fallback for production: your specific Render URL.
const PRODUCTION_BACKEND_URL = 'https://personalhealthreccomendation.onrender.com';

const API_BASE_URL = resolveBackendBaseUrl(configuredBaseUrl) || (isProduction ? PRODUCTION_BACKEND_URL : '');

if (isProduction && (!API_BASE_URL || API_BASE_URL.startsWith('/'))) {
  console.error(
    'CRITICAL: API_BASE_URL is missing or invalid. Falling back to default Render link.'
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
    const message = isCapacitor
      ? `Mobile app could not reach the backend at ${API_BASE_URL}. Please ensure your phone has internet access and the Render backend is live.`
      : isLocalhost
        ? 'Could not reach the local backend. Make sure your server is running on port 8080.'
        : `Could not reach the backend service at "${API_BASE_URL}". Please ensure VITE_BACKEND_URL is set correctly in your Vercel environment variables.`;
    
    throw new ApiClientError(message, 0, err);
  }

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    let message = 'Request failed';
    
    if (typeof payload === 'object' && payload && 'message' in payload) {
      message = String((payload as { message: string }).message);
    } else if (typeof payload === 'string' && payload.length > 0) {
      message = payload;
    }

    const normalizedMessage =
      response.status >= 500
        ? `${message} (Server error ${response.status}. Please check your Render logs for the root cause.)`
        : message;

    throw new ApiClientError(normalizedMessage, response.status, payload);
  }

  return payload as T;
}

export async function checkBackendReachability(): Promise<{ ok: boolean; url: string; error?: string }> {
  const url = `${API_BASE_URL}/api/health`;
  try {
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
    return { ok: response.ok, url };
  } catch (err) {
    return { 
      ok: false, 
      url, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}
