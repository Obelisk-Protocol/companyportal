const API_URL = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = localStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized, try to refresh token
  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}/api${endpoint}`, {
        ...options,
        headers,
      });
    } else {
      // Redirect to login
      window.location.href = '/login';
      throw new ApiError(401, 'Session expired');
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'An error occurred');
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),

  upload: async <T>(endpoint: string, file: File, fieldName = 'file'): Promise<T> => {
    const accessToken = localStorage.getItem('accessToken');
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await fetch(`${API_URL}/api${endpoint}`, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'Upload failed');
    }

    return data as T;
  },
};

export { ApiError };
