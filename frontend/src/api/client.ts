import axios, { AxiosError, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

// Base API configuration
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const { useAuthStore } = await import('@/store/authStore');
        await useAuthStore.getState().refreshAuth();
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, logout and redirect to login
        const { useAuthStore } = await import('@/store/authStore');
        useAuthStore.getState().logout();
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle network errors
    if (!error.response) {
      toast.error('Error de conexión. Verificar conectividad.');
      return Promise.reject(error);
    }
    
    // Handle server errors
    if (error.response.status >= 500) {
      toast.error('Error del servidor. Intenta nuevamente.');
      return Promise.reject(error);
    }
    
    // Handle rate limiting
    if (error.response.status === 429) {
      toast.error('Demasiadas solicitudes. Espera un momento.');
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Helper functions for common API patterns
export const apiUtils = {
  // Handle API errors consistently
  handleError: (error: any): string => {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      return error.response.data.errors.map((e: any) => e.message).join(', ');
    }
    if (error.message) {
      return error.message;
    }
    return 'Error desconocido';
  },
  
  // Create query string from object
  createQueryString: (params: Record<string, any>): string => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, String(item)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    
    return searchParams.toString();
  },
  
  // Format file upload data
  createFormData: (data: Record<string, any>): FormData => {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File || value instanceof Blob) {
          formData.append(key, value);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (item instanceof File || item instanceof Blob) {
              formData.append(key, item);
            } else {
              formData.append(`${key}[${index}]`, String(item));
            }
          });
        } else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });
    
    return formData;
  },
  
  // Handle file downloads
  downloadFile: async (url: string, filename?: string): Promise<void> => {
    try {
      const response = await api.get(url, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error('Error descargando archivo');
      throw error;
    }
  },
};

// Export both as 'api' and 'apiClient' for compatibility
export const apiClient = api;

export default api;