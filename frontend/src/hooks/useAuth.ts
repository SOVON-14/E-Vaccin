import { create } from 'zustand';
import { User, AuthResponse } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
}

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('evaccin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuth = create<AuthState>((set) => ({
  user: getStoredUser(),
  accessToken: localStorage.getItem('evaccin_access_token'),
  isAuthenticated: !!localStorage.getItem('evaccin_access_token'),

  login: (data: AuthResponse) => {
    localStorage.setItem('evaccin_access_token', data.accessToken);
    localStorage.setItem('evaccin_refresh_token', data.refreshToken);
    localStorage.setItem('evaccin_user', JSON.stringify(data.user));
    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('evaccin_access_token');
    localStorage.removeItem('evaccin_refresh_token');
    localStorage.removeItem('evaccin_user');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },
}));
