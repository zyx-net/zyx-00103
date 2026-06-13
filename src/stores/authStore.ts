import { create } from 'zustand';
import { api, User } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    const response = await api.auth.login(username, password);
    
    if (response.success && response.data) {
      localStorage.setItem('token', response.data.id);
      set({ 
        user: response.data as User, 
        token: response.data.id, 
        isLoading: false 
      });
      return true;
    } else {
      set({ 
        error: response.error?.message || '登录失败', 
        isLoading: false 
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, token: null });
      return;
    }

    set({ isLoading: true });
    const response = await api.auth.me();
    
    if (response.success && response.data) {
      set({ user: response.data as User, token, isLoading: false });
    } else {
      localStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
