
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface User {
  id: string;
  email: string;
  role: string;
  assigned_location?: string;
  own_id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: string, location?: string, userData?: { first_name?: string; last_name?: string; phone?: string }, autoLogin?: boolean) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(undefined);
  const [loading, setLoading] = useState(false);

  // Restore user from Supabase session on mount
  useEffect(() => {
    const restoreUser = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          // First try to get basic user info from users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, role, assigned_location, own_id')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (!userError && userData) {
            const trimmedRole = typeof userData.role === 'string' ? userData.role.trim() : userData.role;
            setUser({
              id: userData.id,
              email: userData.email,
              role: trimmedRole && trimmedRole.includes('manager') ? 'manager' : trimmedRole,
              assigned_location: userData.assigned_location,
              own_id: userData.own_id,
              first_name: undefined,
              last_name: undefined,
              phone: undefined,
            });
          } else {
            // If user not found in users table, create basic user object from auth
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              role: 'owner', // Default to owner if not found in users table
              assigned_location: undefined,
              own_id: undefined,
            });
          }
        } catch (error) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: 'owner',
            assigned_location: undefined,
            own_id: undefined,
          });
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
      
      try {
        // Fetch user data from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, role, assigned_location, own_id')
          .eq('id', authData.user.id)
          .maybeSingle();
        
        if (userError || !userData) {
          // If user not found in users table, create basic user object from auth
          setUser({
            id: authData.user.id,
            email: authData.user.email || '',
            role: 'owner', // Default to owner if not found in users table
            assigned_location: undefined,
            own_id: undefined,
          });
        } else {
          const trimmedRole = typeof userData.role === 'string' ? userData.role.trim() : userData.role;
          setUser({
            id: userData.id,
            email: userData.email,
            role: trimmedRole && trimmedRole.includes('manager') ? 'manager' : trimmedRole,
            assigned_location: userData.assigned_location,
            own_id: userData.own_id,
            first_name: undefined,
            last_name: undefined,
            phone: undefined,
          });
        }
              } catch (error) {
          setUser({
          id: authData.user.id,
          email: authData.user.email || '',
          role: 'owner',
          assigned_location: undefined,
          own_id: undefined,
        });
      }
      

    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, role: string, location?: string, userData?: { first_name?: string; last_name?: string; phone?: string }, autoLogin: boolean = true) => {
    setLoading(true);
    try {
      // Preserve current session so owner remains logged in when creating staff
      const { data: pre } = await supabase.auth.getSession();
      const prevAccessToken = pre.session?.access_token || null;
      const prevRefreshToken = pre.session?.refresh_token || null;

      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Validate password requirements
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password
      });
      
      if (authError) {
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('No user returned from signup');
      }
      
      // Prepare user data for insertion into users table
      const userInsertData: any = {
        id: authData.user.id,
        email,
        role,
      };

      // Add assigned_location for managers and workers
      if ((role === 'manager' || role === 'worker') && location) {
        userInsertData.assigned_location = location;
      }

      // Insert into users table
      try {
        const { error: userError } = await supabase.from('users').insert([userInsertData]);
        if (userError) {
          // Don't throw error here, just continue
        }
      } catch (insertError) {
        // Continue without user table insert
      }
      
      // Only set user context and log in if autoLogin is true
      if (autoLogin) {
        setUser({
          id: authData.user.id,
          email,
          role,
          assigned_location: role === 'manager' ? location : undefined,
          own_id: undefined,
          first_name: userData?.first_name,
          last_name: userData?.last_name,
          phone: userData?.phone,
        });
      } else {
        // Sign out the created user so they're not logged in
        await supabase.auth.signOut();
        // Restore previous session (owner stays logged in)
        if (prevAccessToken && prevRefreshToken) {
          try {
            await supabase.auth.setSession({ access_token: prevAccessToken, refresh_token: prevRefreshToken });
          } catch {}
        }
      }
    } catch (error) {
      if (autoLogin) {
        setUser(null);
      }
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
