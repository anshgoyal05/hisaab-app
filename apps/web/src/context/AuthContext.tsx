import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest, setApiAccessToken } from '../lib/api.js';
import { clearOfflineDatabase } from '../lib/offlineSync.js';

interface User {
  id: string;
  email: string;
  settings?: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, confirm: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session by attempting refresh
  useEffect(() => {
    async function initAuth() {
      try {
        const refreshRes = await apiRequest('/auth/refresh', { method: 'POST' });
        if (refreshRes.accessToken) {
          setApiAccessToken(refreshRes.accessToken);
          const meRes = await apiRequest('/me');
          setUser(meRes.user);
        }
      } catch {
        // No active session
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setApiAccessToken(res.accessToken);
    setUser(res.user);
  };

  const register = async (email: string, password: string, confirmPassword: string) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, confirmPassword }),
    });
    setApiAccessToken(res.accessToken);
    setUser(res.user);
  };

  const demoLogin = async () => {
    const res = await apiRequest('/auth/demo', { method: 'POST' });
    setApiAccessToken(res.accessToken);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {}
    setApiAccessToken(null);
    setUser(null);
    await clearOfflineDatabase();
  };

  const refreshUser = async () => {
    try {
      const res = await apiRequest('/me');
      setUser(res.user);
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        demoLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
