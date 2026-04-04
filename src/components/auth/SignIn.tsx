import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../Logo';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SignInProps {
  theme: 'light' | 'dark';
  onSuccess: () => void;
  onToggleView: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ theme, onSuccess, onToggleView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Only redirect if a real session exists
      if (data?.session && data?.user) {
        toast.success('Signed in successfully!');
        onSuccess();
      } else {
        const msg = 'Please verify your email before signing in.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      let msg = 'Failed to sign in';
      if (err.message?.includes('Invalid login credentials')) {
        msg = 'Invalid email or password';
      } else if (err.message?.includes('Email not confirmed')) {
        msg = 'Please verify your email before signing in';
      } else if (err.message?.includes('Too many requests')) {
        msg = 'Too many failed login attempts. Please try again later.';
      } else {
        msg = err.message || msg;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkLogin = async () => {
    if (!email) {
      toast.error('Please enter your email first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
      });

      if (authError) throw authError;

      toast.success('Magic link sent! Check your email.');
    } catch (err: any) {
      console.error('Magic link error:', err);
      const msg = err.message || 'Failed to send magic link';
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
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome Back</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Sign in to your account to continue
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleMagicLinkLogin}
          disabled={isLoading}
          className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold rounded-2xl shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 transition-all flex items-center justify-center gap-3 group disabled:cursor-not-allowed"
        >
          <Mail size={20} className="group-hover:scale-110 transition-transform" />
          Send Magic Link
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 font-bold">Or continue with password</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={20} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all dark:text-white"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all dark:text-white"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-400 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              Sign In
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
          Don't have an account? Sign Up
        </button>
      </div>
    </div>
  );
};
