import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../Logo';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2, User, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Append this domain to username for Supabase email auth
const AUTH_DOMAIN = '@hmsp.local';

interface SignUpProps {
  theme: 'light' | 'dark';
  onSuccess: () => void;
  onToggleView: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ theme, onSuccess, onToggleView }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    // Convert username to email for Supabase auth
    const email = username.toLowerCase().trim() + AUTH_DOMAIN;

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;

      if (data?.user) {
        if (!data.session) {
          const msg = 'Account created! Sign in with your username to continue.';
          setSuccessMessage(msg);
          toast.success(msg);
        } else if (data.user.identities?.length === 0) {
          const msg = 'An account with this username already exists. Please sign in instead.';
          setError(msg);
          toast.error(msg);
        } else {
          const msg = 'Account created! Signing you in...';
          setSuccessMessage(msg);
          toast.success(msg);
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      let msg = 'Failed to sign up';
      if (err.message?.includes('User already registered')) {
        msg = 'Username already in use. Please sign in instead.';
      } else if (err.message?.includes('Password should be at least')) {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else {
        msg = err.message || msg;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8 rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-6">
          <Logo theme={theme} size="lg" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Create Account</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Join us today to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Username field */}
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all dark:text-white"
            />
          </div>

          {/* Password field */}
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={20} />
            <input
              type="password"
              placeholder="Password (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all dark:text-white"
            />
          </div>
        </div>

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold rounded-2xl shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 transition-all flex items-center justify-center gap-2 group disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              Sign Up
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-4">
        <button
          onClick={onToggleView}
          className="text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 font-bold transition-colors"
        >
          Already have an account? Sign In
        </button>
      </div>
    </div>
  );
};
