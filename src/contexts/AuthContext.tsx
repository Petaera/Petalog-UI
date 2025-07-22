
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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

  // Restore user from Supabase session on mount
  useEffect(() => {
    const restoreUser = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch user data from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (!userError && userData) {
          const trimmedRole = typeof userData.role === 'string' ? userData.role.trim() : userData.role;
          setUser({
            id: userData.id,
            email: userData.email,
            role: trimmedRole && trimmedRole.includes('manager') ? 'manager' : trimmedRole,
            assigned_location: userData.assigned_location,
          });
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    };
    restoreUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !authData.user) throw authError || new Error('No user returned');
      // Fetch user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      console.log('Fetched userData from users table:', userData, 'userError:', userError);
      if (userError || !userData) throw userError || new Error('User not found in users table');
      const trimmedRole = typeof userData.role === 'string' ? userData.role.trim() : userData.role;
      setUser({
        id: userData.id,
        email: userData.email,
        role: trimmedRole && trimmedRole.includes('manager') ? 'manager' : trimmedRole,
        assigned_location: userData.assigned_location,
      });
      console.log('User object set in context:', {
        id: userData.id,
        email: userData.email,
        role: trimmedRole && trimmedRole.includes('manager') ? 'manager' : trimmedRole,
        assigned_location: userData.assigned_location,
      });
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, role: string, location?: string) => {
    setLoading(true);
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError || !authData.user) throw authError || new Error('No user returned');
      // Insert into users table
      const { error: userError } = await supabase.from('users').insert([
        {
          id: authData.user.id,
          email,
          role,
          assigned_location: role === 'manager' ? location : null,
        },
      ]);
      if (userError) throw userError;
      setUser({
        id: authData.user.id,
        email,
        role,
        assigned_location: role === 'manager' ? location : undefined,
      });
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
