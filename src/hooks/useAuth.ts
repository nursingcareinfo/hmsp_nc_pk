/**
 * useAuth Hook
 * Lightweight hook to access the current user's role from Supabase session.
 * Uses localStorage cache (set by App.tsx auth listener) for instant reads.
 *
 * Dev override: localStorage.setItem('dev_role_override', 'admin') forces admin mode.
 *               localStorage.removeItem('dev_role_override') reverts to Supabase session.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [role, setRole] = useState<string>('viewer');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dev override: set localStorage.setItem('dev_role_override', 'admin') to force admin mode
    const devRole = localStorage.getItem('dev_role_override');
    if (devRole) {
      setRole(devRole);
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const userRole = session?.user?.user_metadata?.role || 'viewer';
      setRole(userRole);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userRole = session?.user?.user_metadata?.role || 'viewer';
      setRole(userRole);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  return { role, isAdmin: role === 'admin', isLoading };
}
