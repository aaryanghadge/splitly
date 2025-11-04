'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, any>
  ) => Promise<{ user: User | null; error: Error | null }>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  setUser: () => {},
  signUp: async () => ({ user: null, error: null }),
});

export const AuthProvider = ({ 
  children,
  initialSession,
}: { 
  children: React.ReactNode;
  initialSession: Session | null;
}) => {
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);
      }
    );

    if (!initialSession) {
      setLoading(false);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [initialSession, supabase]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: Record<string, any>
  ): Promise<{ user: User | null; error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
        },
      });

      if (error) return { user: null, error: error as unknown as Error };

      const newUser = data.user as User | null;
      if (newUser) {
        setUser(newUser);
        // Ensure profile exists
        await supabase
          .from('profiles')
          .upsert({
            id: newUser.id,
            email: newUser.email,
            name:
              (metadata && (metadata.full_name || metadata.name)) ||
              newUser.user_metadata?.full_name ||
              newUser.user_metadata?.name ||
              newUser.email?.split('@')[0] ||
              'User',
            created_at: new Date().toISOString(),
          }, { onConflict: 'id' });
      }

      return { user: newUser, error: null };
    } catch (e: any) {
      return { user: null, error: e };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signOut,
    setUser,
    signUp,
  };

  return (
    <AuthContext.Provider value={value}>
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