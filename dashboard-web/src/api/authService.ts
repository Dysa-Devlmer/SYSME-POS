// =====================================================
// Authentication Service
// =====================================================
import { api } from './client';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: number;
      username: string;
      full_name: string;
      email: string;
      role: string;
      company_id: number;
      location_id?: number;
    };
  };
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  company_id: number;
  location_id?: number;
}

export const authService = {
  /**
   * Login user
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);

    // Store token
    if (response.data.data.token) {
      localStorage.setItem('auth_token', response.data.data.token);
      // Add token to axios headers
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
    }

    return response.data;
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('auth_token');
      delete api.defaults.headers.common['Authorization'];
    }
  },

  /**
   * Get current user
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  /**
   * Refresh token
   */
  refreshToken: async (): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/refresh');

    if (response.data.data.token) {
      localStorage.setItem('auth_token', response.data.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
    }

    return response.data;
  },

  /**
   * Initialize auth from stored token
   */
  initializeAuth: (): void => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },
};

// Initialize on import
authService.initializeAuth();

export default authService;
