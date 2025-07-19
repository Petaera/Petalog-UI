
import React, { createContext, useContext, useState } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
  assigned_location?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: string, location?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    // Mock login: accept any credentials, assign owner role
    setUser({ id: '1', email, role: 'owner' });
    setLoading(false);
  };

  const signup = async (email: string, password: string, role: string, location?: string) => {
    setLoading(true);
    // Mock signup: accept any credentials, assign given role
    setUser({ id: '1', email, role, assigned_location: location });
    setLoading(false);
  };

  const logout = async () => {
    setUser(null);
  };

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
