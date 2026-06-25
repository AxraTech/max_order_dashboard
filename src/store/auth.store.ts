import { create } from 'zustand';
import type { UserProfile, LoginRequest } from '../types/index';
import { api } from '../services/api';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', credentials);
      const { user, accessToken, refreshToken } = response.data.data;
      
      localStorage.setItem('maxorder_access_token', accessToken);
      localStorage.setItem('maxorder_refresh_token', refreshToken);
      
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Login failed', 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout request failed', e);
    } finally {
      localStorage.removeItem('maxorder_access_token');
      localStorage.removeItem('maxorder_refresh_token');
      set({ user: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('maxorder_access_token');
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      
      const response = await api.get('/auth/profile');
      set({ user: response.data.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('maxorder_access_token');
      localStorage.removeItem('maxorder_refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

