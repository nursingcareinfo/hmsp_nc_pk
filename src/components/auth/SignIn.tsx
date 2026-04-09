import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../Logo';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2, Lock, ArrowRight, UserCircle, Shield, Crown } from 'lucide-react';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AUTH_DOMAIN = '@hmsp.local';

// Pre-defined users - only these two can log in
const ALLOWED_USERS = [
  { username: 'theo', displayName: 'THEO', role: 'Manager', icon: Shield, color: 'teal' },
  { username: 'atif', displayName: 'ATIF ALVI', role: 'CEO', icon: Crown, color: 'amber' },
];

interface SignInProps {
  theme: 'light' | 'dark';
  onSuccess: () => void;
  onToggleView: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ theme, onSuccess, onToggleView }) => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUserData = ALLOWED_USERS.find(u => u.username === selectedUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error('Please select a user first');
      return;
    }
    setIsLoading(true);
    setError(null);

    const email = selectedUser.toLowerCase().trim() + AUTH_DOMAIN;

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data?.session && data?.user) {
        toast.success(`Welcome, ${selectedUserData?.displayName}!`);
        onSuccess();
      } else {
        const msg = 'Please verify your account before signing in.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      let msg = 'Failed to sign in';
      if (err.message?.includes('Invalid login credentials')) {
        msg = 'Invalid password. Please try again.';
      } else if (err.message?.includes('Email not confirmed')) {
        msg = 'Please contact admin to verify your account.';
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
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-6">
          <Logo theme={theme} size="lg" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome Back</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Select your account to continue
        </p>
      </div>

      {/* User Selection Cards */}
      <div className="grid grid-cols-2 gap-3">
        {ALLOWED_USERS.map((user) => {
          const Icon = user.icon;
          const isSelected = selectedUser === user.username;
          const colorMap: Record<string, string> = {
            teal: isSelected
              ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 ring-2 ring-teal-500/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600',
            amber: isSelected
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 ring-2 ring-amber-500/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600',
          };

          return (
            <button
              key={user.username}
              type="button"
              onClick={() => {
                setSelectedUser(user.username);
                setError(null);
                setPassword('');
              }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer',
                colorMap[user.color]
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                isSelected
                  ? user.color === 'teal' ? 'bg-teal-500 text-white' : 'bg-amber-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              )}>
                <Icon size={24} />
              </div>
              <div className="text-center">
                <p className="font-black text-sm text-slate-900 dark:text-white">{user.displayName}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{user.role}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Password Form (shown after user selection) */}
      {selectedUser && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <UserCircle size={20} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Signing in as</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedUserData?.displayName}
                <span className="text-slate-400 font-normal ml-1">({selectedUserData?.role})</span>
              </p>
            </div>
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={20} />
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="current-password"
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all dark:text-white"
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-400 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Sign In as {selectedUserData?.displayName}
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </>
            )}
          </button>

          {/* Change user link */}
          <button
            type="button"
            onClick={() => {
              setSelectedUser(null);
              setPassword('');
              setError(null);
            }}
            className="w-full text-center text-slate-400 hover:text-teal-500 text-xs font-bold transition-colors"
          >
            ← Switch to a different account
          </button>
        </form>
      )}

      {/* Sign Up (hidden for now - admin creates accounts) */}
      <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-slate-400 text-xs">
          H.M.S.P — Home Medical Service Provider
        </p>
      </div>
    </div>
  );
};
