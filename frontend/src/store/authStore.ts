import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/api/client';
import toast from 'react-hot-toast';

// Flag to prevent multiple initializations (important for React StrictMode)
let authInitialized = false;

// Clean up any corrupted localStorage data on module load
try {
  const stored = localStorage.getItem('sysme-auth-storage');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (!parsed.state || typeof parsed.state !== 'object') {
      console.warn('Clearing corrupted auth storage');
      localStorage.removeItem('sysme-auth-storage');
    }
  }
} catch (e) {
  console.warn('Clearing invalid auth storage');
  localStorage.removeItem('sysme-auth-storage');
}

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  language?: string;
  lastLogin?: string;
  sessionId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (credentials: { username: string; password: string; rememberMe?: boolean }) => Promise<void>;
  posLogin: (pin: string) => Promise<void>;
  register: (userData: { username: string; email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (credentials) => {
        try {
          set({ isLoading: true });

          const response = await api.post('/auth/login', credentials);

          if (response.data.success) {
            const { user, accessToken, refreshToken } = response.data.data;

            // Update axios default headers
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

            set({
              user,
              token: accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });

            toast.success(`¡Bienvenido, ${user.name}!`);
          } else {
            throw new Error(response.data.error || 'Login failed');
          }
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.error || error.message || 'Error de inicio de sesión';
          toast.error(errorMessage);
          throw error;
        }
      },

      posLogin: async (pin: string) => {
        try {
          set({ isLoading: true });

          const response = await api.post('/auth/pos/login', { pin });

          if (response.data.success) {
            const { user, token } = response.data;

            // Update axios default headers
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            set({
              user,
              token: token,
              refreshToken: null, // POS login no usa refreshToken
              isAuthenticated: true,
              isLoading: false,
            });

            toast.success(`¡Bienvenido, ${user.name}!`);
          } else {
            throw new Error(response.data.message || 'PIN inválido');
          }
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || error.message || 'PIN incorrecto';
          toast.error(errorMessage);
          throw error;
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true });
          
          const response = await api.post('/auth/register', userData);
          
          if (response.data.success) {
            const { user, accessToken, refreshToken } = response.data.data;
            
            // Update axios default headers
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            
            set({
              user,
              token: accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
            
            toast.success('¡Cuenta creada exitosamente!');
          } else {
            throw new Error(response.data.error || 'Registration failed');
          }
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.error || error.message || 'Error en el registro';
          toast.error(errorMessage);
          throw error;
        }
      },

      logout: async () => {
        try {
          const { token } = get();
          
          if (token) {
            // Call logout endpoint to blacklist token
            try {
              await api.post('/auth/logout');
            } catch (error) {
              // Continue with logout even if API call fails
              console.warn('Logout API call failed:', error);
            }
          }
          
          // Clear axios headers
          delete api.defaults.headers.common['Authorization'];
          
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          
          toast.success('Sesión cerrada correctamente');
        } catch (error: any) {
          console.error('Logout error:', error);
          // Force logout even if there's an error
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      refreshAuth: async () => {
        try {
          const { refreshToken } = get();
          
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          
          const response = await api.post('/auth/refresh-token', {
            refreshToken,
          });
          
          if (response.data.success) {
            const { accessToken } = response.data.data;
            
            // Update axios default headers
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            
            set({ token: accessToken });
            
            return accessToken;
          } else {
            throw new Error('Failed to refresh token');
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          // Force logout on refresh failure
          get().logout();
          throw error;
        }
      },

      updateProfile: async (data) => {
        try {
          set({ isLoading: true });
          
          const response = await api.put('/auth/profile', data);
          
          if (response.data.success) {
            const updatedUser = response.data.data.user;
            
            set((state) => ({
              user: { ...state.user, ...updatedUser },
              isLoading: false,
            }));
            
            toast.success('Perfil actualizado correctamente');
          } else {
            throw new Error(response.data.error || 'Update failed');
          }
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.error || error.message || 'Error actualizando perfil';
          toast.error(errorMessage);
          throw error;
        }
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      checkAuth: async () => {
        try {
          const { token } = get();
          
          if (!token) {
            set({ isLoading: false, isAuthenticated: false });
            return;
          }
          
          // Set auth header
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token by fetching user profile
          const response = await api.get('/auth/profile');
          
          if (response.data.success) {
            const user = response.data.data.user;
            
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            throw new Error('Invalid token');
          }
        } catch (error: any) {
          console.error('Auth check failed:', error);
          
          // Try to refresh token
          try {
            await get().refreshAuth();
            await get().checkAuth(); // Retry after refresh
          } catch (refreshError) {
            // If refresh also fails, logout
            set({
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
            });
            delete api.defaults.headers.common['Authorization'];
          }
        }
      },
    }),
    {
      name: 'sysme-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth check on store creation (without showing toasts)
// Use flag to prevent double initialization in React StrictMode
if (!authInitialized) {
  authInitialized = true;

  (async () => {
    const state = useAuthStore.getState();
    if (state.token) {
      try {
        await state.checkAuth();
      } catch (error) {
        console.log('Session expired or invalid');
        useAuthStore.setState({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  })();
}