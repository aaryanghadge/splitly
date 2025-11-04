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
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  setUser: () => {},
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

  const value: AuthContextType = {
    user,
    session,
    loading,
    signOut,
    setUser,
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