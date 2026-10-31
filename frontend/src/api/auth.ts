import { api } from './client';
import { UserProfile, UserRole } from '@/types';

export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export interface RegisterResponseData {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
  };
}

export interface MeResponseData {
  id: string;
  email: string;
  role: UserRole;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export const authApi = {
  // POST /api/v1/auth/login
  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post<LoginResponseData>('/auth/login', credentials);
    if (res.success && res.data?.access_token) {
      api.setToken(res.data.access_token);
      localStorage.setItem('brightloop_user_session', JSON.stringify(res.data.user));
    }
    return res;
  },

  // POST /api/v1/auth/register
  register: async (payload: { email: string; password: string; full_name: string }) => {
    return api.post<RegisterResponseData>('/auth/register', payload);
  },

  // POST /api/v1/auth/forgot-password
  forgotPassword: async (payload: { email: string }) => {
    return api.post<{ message: string }>('/auth/forgot-password', payload);
  },

  // GET /api/v1/auth/me
  me: async () => {
    return api.get<MeResponseData>('/auth/me');
  },

  // POST /api/v1/staff (Admin only)
  createStaff: async (payload: { email: string; password: string; full_name: string }) => {
    return api.post<{ user: UserProfile }>('/staff', payload);
  },

  // Local logout helper
  logout: () => {
    api.setToken(null);
    localStorage.removeItem('brightloop_user_session');
  },
};

