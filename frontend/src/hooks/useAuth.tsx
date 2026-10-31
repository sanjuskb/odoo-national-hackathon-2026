import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '@/types';
import { authApi } from '@/api/auth';
import { api } from '@/api/client';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (payload: { email: string; password: string; full_name: string }) => Promise<{ success: boolean; message?: string; errors?: any }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('brightloop_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session against server /api/v1/auth/me on mount
  const refreshUser = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authApi.me();
      if (res.success && res.data) {
        const verifiedUser: UserProfile = {
          id: res.data.id || res.data.user?.id,
          email: res.data.email || res.data.user?.email,
          name: (res.data as any).full_name || (res.data.user as any)?.full_name || res.data.email?.split('@')[0] || 'User',
          role: res.data.role || res.data.user?.role || 'customer',
        };
        setUser(verifiedUser);
        localStorage.setItem('brightloop_user_session', JSON.stringify(verifiedUser));
      } else {
        // Token expired or invalid
        authApi.logout();
        setUser(null);
      }
    } catch {
      // In case of network errors during mount, retain cached user if present but do not invent role
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.data?.user) {
        const verifiedUser: UserProfile = {
          id: res.data.user.id,
          email: res.data.user.email,
          name: (res.data.user as any).full_name || res.data.user.email.split('@')[0],
          role: res.data.user.role,
        };
        setUser(verifiedUser);
        setIsLoading(false);
        return { success: true, message: res.message };
      }
      setIsLoading(false);
      return { success: false, message: res.message || 'Invalid email or password' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: 'Unable to connect to the server. Please try again later.' };
    }
  };

  const register = async (payload: { email: string; password: string; full_name: string }) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(payload);
      setIsLoading(false);
      if (res.success) {
        return { success: true, message: res.message };
      }
      return {
        success: false,
        message: res.message || 'Registration failed',
        errors: res.errors,
      };
    } catch {
      setIsLoading(false);
      return { success: false, message: 'Unable to connect to the server. Please try again later.' };
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user && !!api.getToken(),
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
