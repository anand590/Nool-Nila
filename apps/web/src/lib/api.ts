const RAW_API_URL = (import.meta.env.VITE_API_URL as string) || '/api/v1';
const API_BASE = RAW_API_URL.replace(/\/+$/, '');

// Generate or retrieve persistent guest session ID
export function getSessionId(): string {
  let sessionId = localStorage.getItem('nn_session_id');
  if (!sessionId) {
    sessionId = 'guest_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('nn_session_id', sessionId);
  }
  return sessionId;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('nn_auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('nn_auth_token', token);
  } else {
    localStorage.removeItem('nn_auth_token');
  }
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message?: string; errors?: any[] }> {
  const token = getAuthToken();
  const sessionId = getSessionId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-id': sessionId,
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include HTTP-only cookies
  });

  const json = await response.json().catch(() => ({
    success: false,
    message: 'Failed to parse response from server',
  }));

  if (!response.ok) {
    const errorMsg = json.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).errors = json.errors;
    throw err;
  }

  return json;
}
