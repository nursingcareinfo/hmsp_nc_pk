import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  Users,
  UserRound,
  TrendingUp,
  Activity,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { Staff, Patient, AdvanceRecord } from '../types';
import { advancesService } from '../services/advancesService';
import { geminiService } from '../services/geminiService';
import { SupabaseStatus } from './SupabaseStatus';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
          change > 0 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
        )}>
          {change > 0 ? "+" : ""}{change}%
          <TrendingUp size={12} className={change < 0 ? "rotate-180" : ""} />
        </div>
      )}
    </div>
    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
  </div>
);

const StatCardSkeleton = ({ title }: { title: string }) => (
  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      <div className="w-14 h-5 bg-slate-200 dark:bg-slate-700 rounded-full" />
    </div>
    <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
    <div className="w-16 h-7 bg-slate-200 dark:bg-slate-700 rounded" />
  </div>
);

const ListSkeleton = () => (
  <div className="flex items-center gap-4 p-4 rounded-2xl animate-pulse">
    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="w-48 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
    <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded-full" />
  </div>
);

export const DashboardModule = ({ staff, patients, setActiveTab }: { staff: Staff[], patients: Patient[], setActiveTab: (tab: string) => void }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentAdvances, setRecentAdvances] = useState<AdvanceRecord[]>([]);
  const isDataLoading = staff.length === 0 && patients.length === 0;

  // Fetch recent advances
  useEffect(() => {
    advancesService.getAll().then(data => {
      setRecentAdvances(data.slice(0, 10));
    });
  }, []);

  const generateInsights = async () => {
    if (staff.length === 0 && patients.length === 0) return;

    setIsGenerating(true);
    try {
      const prompt = `Based on the following LIVE data from Supabase, provide a brief (3-4 bullet points) strategic summary for H.M.S.P:
        - Total Staff: ${staff.length}
        - Active Staff: ${staff.filter(s => s.status === 'Active').length}
        - Active Patients: ${patients.filter(p => p.status === 'Active').length}
        - Pending Registrations: ${patients.filter(p => p.status === 'Pending').length}
        - Key Areas: ${Array.from(new Set(staff.map(s => s.official_district))).slice(0, 5).join(', ')}

        Focus on immediate operational needs, staff utilization, and patient fulfillment in Karachi.`;

      const result = await geminiService.fastTask(prompt);
      setInsights(result);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Defer AI insights until after initial render to unblock LCP
  useEffect(() => {
    const timer = setTimeout(() => {
      generateInsights();
    }, 3000); // Wait 3s after page paint
    return () => clearTimeout(timer);
  }, []);

  // Real data from Supabase — NO hardcoded fallbacks
  const districtData = [
    { name: 'Central', count: staff.filter(s => s.official_district?.includes('Central')).length },
    { name: 'East', count: staff.filter(s => s.official_district?.includes('East')).length },
    { name: 'South', count: staff.filter(s => s.official_district?.includes('South')).length },
    { name: 'West', count: staff.filter(s => s.official_district?.includes('West')).length },
    { name: 'Korangi', count: staff.filter(s => s.official_district?.includes('Korangi')).length },
  ];

  const designationData = [
    { name: 'Nurses', value: staff.filter(s => s.category === 'Nurses').length },
    { name: 'Attendants', value: staff.filter(s => s.category === 'Attendants').length },
    { name: 'Midwives', value: staff.filter(s => s.category === 'Midwives').length },
  ];

  const COLORS = ['#0d9488', '#0ea5e9', '#6366f1', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-r from-teal-600 to-sky-600 p-1 rounded-[32px] shadow-lg shadow-teal-100 dark:shadow-teal-900/20">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-6 rounded-[30px] flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-inner shrink-0">
                <Sparkles size={32} className={cn(isGenerating ? "animate-spin" : "animate-pulse")} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-black text-teal-900 dark:text-teal-400 uppercase tracking-widest">H.M.S.P Live AI</h3>
                  <div className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase animate-pulse">Live Feed</div>
                </div>
                {isGenerating ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-sm font-medium italic">AI is processing live database events...</span>
                  </div>
                ) : insights ? (
                  <div className="prose prose-sm max-w-none prose-teal dark:prose-invert">
                    <ReactMarkdown>{insights}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">Waiting for live data stream...</p>
                )}
              </div>
              <button 
                onClick={generateInsights}
                disabled={isGenerating}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shrink-0 disabled:opacity-50"
              >
                Re-Analyze
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-sm overflow-hidden h-full">
          <SupabaseStatus />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isDataLoading ? (
          <>
            <StatCardSkeleton title="Total Staff" />
            <StatCardSkeleton title="Active Patients" />
            <StatCardSkeleton title="Active Staff" />
            <StatCardSkeleton title="Pending Cases" />
          </>
        ) : (
          <>
            <StatCard
              title="Total Staff"
              value={staff.length}
              change={12}
              icon={Users}
              color="bg-teal-600"
            />
            <StatCard
              title="Active Patients"
              value={patients.filter(p => p.status === 'Active').length}
              change={8}
              icon={UserRound}
              color="bg-sky-600"
            />
            <StatCard
              title="Active Staff"
              value={staff.filter(s => s.status === 'Active').length}
              change={5}
              icon={Activity}
              color="bg-indigo-600"
            />
            <StatCard
              title="Pending Cases"
              value={patients.filter(p => p.status === 'Pending').length}
              change={-2}
              icon={Activity}
              color="bg-violet-600"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Advance History</h3>
            <button
              onClick={() => setActiveTab('advances')}
              className="text-teal-600 dark:text-teal-400 text-sm font-bold hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {isDataLoading ? (
              <>
                <ListSkeleton />
                <ListSkeleton />
                <ListSkeleton />
                <ListSkeleton />
              </>
            ) : recentAdvances.length > 0 ? (
              recentAdvances.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-lg">
                      {a.staff_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{a.staff_name}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{a.staff_designation} • {a.reason || 'No reason provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">Rs. {a.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">{new Date(a.advance_date).toLocaleDateString('en-PK')}</p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1",
                      a.status === 'Approved' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
                      a.status === 'Pending' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" :
                      a.status === 'Deducted' ? "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400" :
                      "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                    )}>
                      {a.status === 'Approved' && <CheckCircle size={10} />}
                      {a.status === 'Pending' && <Clock size={10} />}
                      {a.status === 'Deducted' && <ArrowDownRight size={10} />}
                      {a.status === 'Cancelled' && <AlertCircle size={10} />}
                      {a.status}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 italic text-sm">
                <Wallet size={32} className="mx-auto mb-3 opacity-50" />
                No advance records found.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Admissions</h3>
            <button 
              onClick={() => setActiveTab('patients')}
              className="text-teal-600 dark:text-teal-400 text-sm font-bold hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {isDataLoading ? (
              <>
                <ListSkeleton />
                <ListSkeleton />
                <ListSkeleton />
              </>
            ) : patients.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-lg">
                    {p.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{p.full_name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{p.medical_condition} • {p.district}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    p.status === 'Active' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                  )}>
                    {p.status}
                  </div>
                </div>
              </div>
            ))}
            {patients.length === 0 && !isDataLoading && (
              <div className="text-center py-8 text-slate-400 italic text-sm">No patient records found in Supabase.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
