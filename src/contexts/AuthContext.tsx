
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch user profile from your users table
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (data) setUser(data as User);
        else setUser({ id: session.user.id, email: session.user.email || '', role: 'owner' });
      } else {
        setUser(null);
      }
    });
    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (data) setUser(data as User);
        else setUser({ id: session.user.id, email: session.user.email || '', role: 'owner' });
      }
      setLoading(false);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setLoading(false);
  };

  const signup = async (email: string, password: string, role: string, location?: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Insert user profile into users table
    if (data.user) {
      await supabase.from('users').insert([
        {
          id: data.user.id,
          email,
          role,
          assigned_location: location || null,
        },
      ]);
    }
    setLoading(false);
  };

  const logout = async () => {
    console.log('Logging out...');
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
