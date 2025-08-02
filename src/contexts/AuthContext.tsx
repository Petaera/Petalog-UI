
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
  const [user, setUser] = useState<User | null>(null);
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
            console.log('User not found in users table, using auth user data');
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
          console.log('Error accessing users table, using auth user data:', error);
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
        
        console.log('Fetched userData from users table:', userData, 'userError:', userError);
        
        if (userError || !userData) {
          console.log('User not found in users table, using auth user data');
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
        console.log('Error accessing users table, using auth user data:', error);
        setUser({
          id: authData.user.id,
          email: authData.user.email || '',
          role: 'owner',
          assigned_location: undefined,
          own_id: undefined,
        });
      }
      
      console.log('User object set in context:', user);
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
      console.log('Starting signup process...', { email, role, location, userData, autoLogin });
      
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
        console.error('Auth error:', authError);
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('No user returned from signup');
      }
      
      console.log('Auth user created:', authData.user.id);
      
      // Prepare user data for insertion into users table
      const userInsertData: any = {
        id: authData.user.id,
        email,
        role,
      };

      // Add assigned_location for managers
      if (role === 'manager' && location) {
        userInsertData.assigned_location = location;
      }

      console.log('Inserting user data into users table:', userInsertData);

      // Insert into users table
      try {
        const { error: userError } = await supabase.from('users').insert([userInsertData]);
        if (userError) {
          console.error('User insert error:', userError);
          // Don't throw error here, just log it
          console.log('Continuing without user table insert');
        } else {
          console.log('User data inserted successfully into users table');
        }
      } catch (insertError) {
        console.error('Exception during user insert:', insertError);
        console.log('Continuing without user table insert');
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
        console.log('User created but not logged in (autoLogin: false)');
      }
    } catch (error) {
      console.error('Signup error:', error);
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
