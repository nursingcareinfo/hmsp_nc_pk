import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { INITIAL_STAFF } from '../staffData';
import { toast } from 'sonner';
import { Database, Loader2, AlertCircle, CheckCircle2, Users, UserRound, RefreshCw } from 'lucide-react';

interface Stats {
  staffCount: number;
  patientCount: number;
}

export const SupabaseStatus: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const handleManualSync = async () => {
    if (!supabase) return;
    setIsSyncing(true);
    setSyncProgress(0);
    try {
      const { data: currentData } = await supabase.from('staff').select('id', { count: 'exact', head: true });
      if (currentData && currentData.length > 0) {
        toast.info('Database already has data. Sync skipped.');
        setIsSyncing(false);
        return;
      }

      const toInsert = INITIAL_STAFF.map((s, index) => {
        const { id, ...rest } = s;
        return {
          ...rest,
          assigned_id: s.assigned_id || `NC-KHI-${(index + 1).toString().padStart(3, '0')}`,
          shift_rate: s.shift_rate || Math.round(s.salary / 30)
        };
      });

      const batchSize = 100;
      const totalBatches = Math.ceil(toInsert.length / batchSize);
      
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { error: seedError } = await supabase.from('staff').insert(batch);
        if (seedError) throw seedError;
        setSyncProgress(Math.round(((i + batch.length) / toInsert.length) * 100));
      }
      
      toast.success('Staff data synced successfully!');
      window.location.reload(); // Refresh to show new data
    } catch (err: any) {
      console.error('Sync Error:', err);
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const checkConnectionAndFetchStats = async () => {
      try {
        if (!supabase) {
          setError('Supabase configuration missing');
          setLoading(false);
          return;
        }

        // Test connection
        const { data: healthData, error: healthError } = await supabase.from('staff').select('id', { count: 'exact', head: true });
        
        if (healthError) throw healthError;
        
        setIsConnected(true);
        
        // Fetch stats
        const { count: staffCount } = await supabase.from('staff').select('*', { count: 'exact', head: true });
        const { count: patientCount } = await supabase.from('patients').select('*', { count: 'exact', head: true });
        
        setStats({
          staffCount: staffCount || 0,
          patientCount: patientCount || 0
        });
      } catch (err: any) {
        console.error('Supabase Error:', err);
        setError(err.message || 'Failed to connect to Supabase');
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };

    checkConnectionAndFetchStats();
    
    // Set up real-time subscription for stats
    if (supabase) {
      const staffChannel = supabase.channel('staff-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
          checkConnectionAndFetchStats();
        })
        .subscribe();
        
      const patientChannel = supabase.channel('patient-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
          checkConnectionAndFetchStats();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(staffChannel);
        supabase.removeChannel(patientChannel);
      };
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 p-6">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-medium">Connecting to Supabase...</span>
      </div>
    );
  }

  if (error) {
    const isFetchError = error.includes('Failed to fetch') || error.includes('Network Error');
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-rose-500 font-bold">
          <AlertCircle size={20} />
          <h3 className="text-sm uppercase tracking-wider">Supabase Offline</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
        
        {isFetchError && (
          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 space-y-2">
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Troubleshooting:</p>
            <ul className="text-[10px] text-rose-500 list-disc pl-3 space-y-1">
              <li>Check if your <b>VITE_SUPABASE_URL</b> starts with <b>https://</b></li>
              <li>Ensure your <b>VITE_SUPABASE_ANON_KEY</b> starts with <b>eyJ</b></li>
              <li>Ensure there are no extra spaces in your <b>Secrets</b></li>
              <li>Disable any AdBlockers or VPNs that might block Supabase</li>
              <li>Check if your Supabase project is <b>Healthy</b> (not paused)</li>
            </ul>
            
            <div className="mt-3 pt-2 border-t border-rose-100">
              <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-1">Debug Info:</p>
              <div className="space-y-1 font-mono text-[9px] text-rose-400">
                <p className="break-all">URL: {import.meta.env.VITE_SUPABASE_URL || 'MISSING'}</p>
                <p>KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 8)}...` : 'MISSING'}</p>
                <p>Protocol: {window.location.protocol}</p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black uppercase tracking-widest text-xs">
          <Database size={16} className="text-teal-600 dark:text-teal-400" />
          <h3>Supabase Status</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-800">
          <CheckCircle2 size={10} />
          <span className="text-[10px] font-bold uppercase">Live</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-teal-200 dark:hover:border-teal-700 transition-colors">
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
            <Users size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Staff</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats?.staffCount}</div>
        </div>
        
        <div className="bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-sky-200 dark:hover:border-sky-700 transition-colors">
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
            <UserRound size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Patients</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats?.patientCount}</div>
        </div>
      </div>
      
      <div className="text-[10px] text-slate-400 italic">
        Real-time sync enabled for all modules.
      </div>

      {stats?.staffCount === 0 && (
        <div className="pt-2 border-t border-slate-100">
          {isSyncing ? (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>Syncing Data...</span>
                <span>{syncProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 transition-all duration-300" 
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={handleManualSync}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-50 text-teal-600 rounded-xl border border-teal-100 hover:bg-teal-100 transition-all group"
            >
              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Sync Initial Data</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
