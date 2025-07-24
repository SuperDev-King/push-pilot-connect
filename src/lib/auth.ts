// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-domain.com' 
  : 'https://localhost:5001'; // Update with your VB.NET API URL

// JWT token management
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// Token storage functions
export const setAuthToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('token_timestamp', Date.now().toString());
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token_timestamp');
  localStorage.removeItem('user_data');
};

export const setUserData = (user: User): void => {
  localStorage.setItem('user_data', JSON.stringify(user));
};

export const getUserData = (): User | null => {
  const userData = localStorage.getItem('user_data');
  return userData ? JSON.parse(userData) : null;
};

// JWT token validation
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    // Check if token is expired
    if (payload.exp && payload.exp < currentTime) {
      removeAuthToken();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    removeAuthToken();
    return false;
  }
};

// Get user ID from JWT token
export const getUserIdFromToken = (): string | null => {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.nameid || payload.sub || null;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
};

// API call with JWT authentication
export const authenticatedFetch = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle unauthorized responses
    if (response.status === 401) {
      removeAuthToken();
      // Optionally redirect to login
      window.location.href = '/';
    }

    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Authentication functions
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data: LoginResponse = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    if (data.success && data.token && data.user) {
      setAuthToken(data.token);
      setUserData(data.user);
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Register FCM token with backend
export const registerFCMToken = async (fcmToken: string, deviceType?: string): Promise<ApiResponse> => {
  try {
    const userAgent = navigator.userAgent;
    const detectedDeviceType = deviceType || (
      /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' : 'web'
    );

    const response = await authenticatedFetch('/api/notification/register-fcm-token', {
      method: 'POST',
      body: JSON.stringify({ 
        fcmToken, 
        deviceType: detectedDeviceType 
      }),
    });

    const data: ApiResponse = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to register FCM token');
    }

    return data;
  } catch (error) {
    console.error('FCM token registration error:', error);
    throw error;
  }
};

// Get user's FCM tokens
export const getUserFCMTokens = async (): Promise<string[]> => {
  try {
    const response = await authenticatedFetch('/api/notification/fcm-tokens');
    const data: ApiResponse<string[]> = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get FCM tokens');
    }

    return data.data || [];
  } catch (error) {
    console.error('Error getting FCM tokens:', error);
    throw error;
  }
};

// Remove FCM token
export const removeFCMToken = async (token: string): Promise<ApiResponse> => {
  try {
    const response = await authenticatedFetch(`/api/notification/fcm-token/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });

    const data: ApiResponse = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to remove FCM token');
    }

    return data;
  } catch (error) {
    console.error('Error removing FCM token:', error);
    throw error;
  }
};

// Refresh JWT token
export const refreshToken = async (): Promise<string | null> => {
  try {
    const response = await authenticatedFetch('/api/auth/refresh-token', {
      method: 'POST',
    });

    const data: ApiResponse<{ token: string }> = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to refresh token');
    }

    if (data.success && data.data?.token) {
      setAuthToken(data.data.token);
      return data.data.token;
    }

    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    removeAuthToken();
    return null;
  }
};

// Logout function
export const logout = async (): Promise<void> => {
  try {
    // Optionally call logout endpoint on server
    // await authenticatedFetch('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    removeAuthToken();
  }
};