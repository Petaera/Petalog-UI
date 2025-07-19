
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  uid: string;
  email: string;
  role: 'owner' | 'manager';
  assignedLocation?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: 'owner' | 'manager', location?: string) => Promise<void>;
  logout: () => void;
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

// Mock authentication for development - replace with actual Firebase implementation
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for existing session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    
    // Mock authentication - replace with Firebase Auth
    const mockUser: User = {
      uid: '123',
      email,
      role: email.includes('manager') ? 'manager' : 'owner',
      assignedLocation: email.includes('manager') ? '1' : undefined
    };
    
    localStorage.setItem('user', JSON.stringify(mockUser));
    setUser(mockUser);
    setLoading(false);
  };

  const signup = async (email: string, password: string, role: 'owner' | 'manager', location?: string) => {
    setLoading(true);
    
    // Mock signup - replace with Firebase Auth + Firestore
    const newUser: User = {
      uid: Math.random().toString(36).substr(2, 9),
      email,
      role,
      assignedLocation: role === 'manager' ? location : undefined
    };
    
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    login,
    signup,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
