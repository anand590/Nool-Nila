import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDto, LoginInput, RegisterInput } from '@nool-and-nila/shared';
import { fetchApi, setAuthToken, getSessionId } from '../lib/api';

interface AuthContextType {
  user: UserDto | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetchApi<UserDto>('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (input: LoginInput) => {
    const res = await fetchApi<{ user: UserDto; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.success && res.data) {
      setAuthToken(res.data.token);
      setUser(res.data.user);
      try {
        const guestSessionId = getSessionId();
        await fetchApi('/cart/merge', {
          method: 'POST',
          body: JSON.stringify({ sessionId: guestSessionId }),
        });
      } catch {
        // Non-blocking
      }
    }
  };

  const register = async (input: RegisterInput) => {
    const res = await fetchApi<{ user: UserDto; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.success && res.data) {
      setAuthToken(res.data.token);
      setUser(res.data.user);
      try {
        const guestSessionId = getSessionId();
        await fetchApi('/cart/merge', {
          method: 'POST',
          body: JSON.stringify({ sessionId: guestSessionId }),
        });
      } catch {
        // Non-blocking
      }
    }
  };

  const logout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    setAuthToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
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
