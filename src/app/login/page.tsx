'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { CircleDollarSign } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div 
          onClick={() => router.push('/')}
          className="flex items-center justify-center gap-3 mb-8 cursor-pointer"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <CircleDollarSign className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Splitly
          </span>
        </div>

        {/* Auth Container */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to Splitly
          </h2>
          <p className="text-gray-400 mb-6">
            Sign in to start splitting expenses with friends
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-900 hover:bg-gray-100 border border-gray-300 rounded-xl font-medium transition-all disabled:opacity-50 shadow-sm"
          >
            <img 
              src="/google.svg" 
              alt="Google" 
              className="w-5 h-5"
              onError={(e) => {
                // Fallback if image doesn't load
                e.currentTarget.style.display = 'none';
              }}
            />
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}