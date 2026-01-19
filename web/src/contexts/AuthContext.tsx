import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'hr' | 'employee' | 'accountant' | 'client';
  employeeId?: string;
  companyId?: string;
  individualClientId?: string;
  employee?: {
    id: string;
    fullName: string;
    employeeNumber: string;
    avatarUrl?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  // Test mode: switch roles without logging in
  switchRole?: (role: 'admin' | 'hr' | 'employee' | 'accountant' | 'client') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setUser(null);
        return;
      }

      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', { email, password });
    
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    
    setUser(response.user);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    // Call logout endpoint (fire and forget)
    api.post('/auth/logout', { refreshToken }).catch(() => {});
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  // Test mode: switch roles for testing UI without logging in
  const switchRole = (role: 'admin' | 'hr' | 'employee' | 'accountant' | 'client') => {
    if (!user) {
      // Create a test user if none exists
      setUser({
        id: 'test-user-id',
        email: `test-${role}@example.com`,
        role,
      });
    } else {
      // Update existing user's role
      setUser({
        ...user,
        role,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
