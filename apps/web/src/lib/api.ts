const API_BASE = '/api/v1';

export class ApiError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

let currentAccessToken: string | null = null;

export function setApiAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getApiAccessToken(): string | null {
  return currentAccessToken;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (currentAccessToken) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // send httpOnly refresh token cookie
    });

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      const csvText = await response.text();
      return csvText as unknown as T;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || data.message || 'Request failed',
        data.error?.code || data.code || 'REQUEST_FAILED',
        data.error?.details || data.details
      );
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network disconnection: trigger offline mode handling
    throw new ApiError(
      'Network request failed. You may be offline.',
      'NETWORK_ERROR'
    );
  }
}
