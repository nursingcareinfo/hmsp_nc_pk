import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  AlertCircle,
  UserCheck,
  Hourglass,
  MapPin,
  Stethoscope
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
import { dutyService } from '../services/dutyService';
import { geminiService } from '../services/geminiService';
import { getKarachiToday, getCurrentShift } from '../utils/dateUtils';
import { formatPKDate } from '../lib/utils';
import { SupabaseStatus } from './SupabaseStatus';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl transition-all group-hover:scale-110", color)}>
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

export const DashboardModule = ({ 
  staff, 
  patients, 
  setActiveTab, 
  isLoading 
}: { 
  staff: Staff[], 
  patients: Patient[], 
  setActiveTab: (tab: string) => void,
  isLoading?: boolean
}) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Use React Query for advances for automatic cache management
  const { data: recentAdvances = [], isLoading: advancesLoading } = useQuery({
    queryKey: ['advances-recent'],
    queryFn: () => advancesService.getRecent(50),
    staleTime: 2 * 60 * 1000,
  });

  // Use React Query for correct 'Currently On Duty' count
  const { data: onDutyCount = 0, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['on-duty-count'],
    queryFn: () => dutyService.getCurrentlyOnDutyCount(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const activeStaff = useMemo(() => staff.filter(s => s.status === 'Active'), [staff]);
  const activePatients = useMemo(() => patients.filter(p => p.status === 'Active'), [patients]);
  const pendingPatients = useMemo(() => patients.filter(p => p.status === 'Pending'), [patients]);
  
  // Calculate Available Staff: Active but not currently on duty
  // Note: This is an approximation as onDutyCount counts unique staff across the shift
  const availableStaffCount = Math.max(0, activeStaff.length - (onDutyCount || 0));

  // Use props.isLoading if provided, otherwise check if we have data or are fetching
  const isDataLoading = isLoading || (staff.length === 0 && patients.length === 0 && isLoading === undefined);

  const generateInsights = async () => {
    if (isGenerating || (staff.length === 0 && patients.length === 0)) return;

    setIsGenerating(true);
    try {
      // Calculate advance summary context for AI
      const totalAdvanceAmount = recentAdvances.reduce((sum, a) => sum + a.amount, 0);
      const pendingAdvances = recentAdvances.filter(a => a.status === 'Pending').length;
      const currentShift = getCurrentShift();

      const prompt = `Based on the following LIVE data from Supabase, provide a brief (3-4 bullet points) strategic summary for NursingCare Solutions. 
        Current Shift in Karachi: ${currentShift.toUpperCase()}
        - Total Staff: ${staff.length} (${activeStaff.length} Active)
        - Staff currently ON DUTY (for active ${currentShift} shift): ${onDutyCount}
        - Available Staff (Active but not on duty): ${availableStaffCount}
        - Patients: ${activePatients.length} Active, ${pendingPatients.length} Pending
        - Latest 50 Advance Total: Rs. ${totalAdvanceAmount.toLocaleString()} (${pendingAdvances} Pending)
        - Service Coverage Areas: ${Array.from(new Set(staff.map(s => s.official_district))).filter(d => d && d !== 'Other').slice(0, 5).join(', ')}

        Focus on immediate operational needs, staff utilization (comparing active vs on-duty), and patient fulfillment in Karachi. Keep it professional and actionable.`;

      const result = await geminiService.fastTask(prompt);
      setInsights(result);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      setInsights("Unable to generate live insights at this time. Please check your connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Defer AI insights until data is available to unblock LCP
  useEffect(() => {
    if (!isDataLoading && !assignmentsLoading && !advancesLoading && !insights && !isGenerating && staff.length > 0) {
      const timer = setTimeout(() => {
        generateInsights();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isDataLoading, assignmentsLoading, advancesLoading, insights, isGenerating, staff.length]);

  // Robust District Normalization
  const districtCounts = useMemo(() => {
    return staff.reduce((acc: Record<string, number>, s) => {
      let rawDistrict = (s.official_district || 'Other').trim();
      let normalized = rawDistrict.toUpperCase();
      
      if (normalized.startsWith('KARACHI ')) normalized = normalized.substring(8);
      if (normalized.startsWith('DISTRICT ')) normalized = normalized.substring(9);
      
      if (normalized.includes('SOUTH')) normalized = 'Karachi South';
      else if (normalized.includes('EAST')) normalized = 'Karachi East';
      else if (normalized.includes('WEST')) normalized = 'Karachi West';
      else if (normalized.includes('CENTRAL')) normalized = 'Karachi Central';
      else if (normalized.includes('KORANGI')) normalized = 'Korangi';
      else if (normalized.includes('MALIR')) normalized = 'Malir';
      else if (normalized.includes('KEAMARI')) normalized = 'Keamari';
      else if (normalized.includes('GULSHAN')) normalized = 'Gulshan-e-Iqbal';
      else {
        normalized = normalized.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
      
      acc[normalized] = (acc[normalized] || 0) + 1;
      return acc;
    }, {});
  }, [staff]);

  const districtData = useMemo(() => {
    return Object.entries(districtCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Increased from 6 to 8 to show all major Karachi districts
  }, [districtCounts]);


  // Staff category distribution
  const categoryCounts = useMemo(() => {
    const categoryData = staff.reduce((acc: Record<string, number>, s) => {
      const cat = s.category || 'Other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categoryData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [staff]);

  const COLORS = ['#0d9488', '#0ea5e9', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'];

  const recentAdmissions = useMemo(() => {
    return [...patients]
      .sort((a, b) => {
        const dateA = a.admission_date ? new Date(a.admission_date).getTime() : 0;
        const dateB = b.admission_date ? new Date(b.admission_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [patients]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {isDataLoading ? (
          <>
            <StatCardSkeleton title="Active Staff" />
            <StatCardSkeleton title="Active Patients" />
            <StatCardSkeleton title="Currently On Duty" />
            <StatCardSkeleton title="Available Staff" />
            <StatCardSkeleton title="Pending Cases" />
          </>
        ) : (
          <>
            <StatCard
              title="Active Staff"
              value={activeStaff.length}
              icon={UserCheck}
              color="bg-teal-600"
            />
            <StatCard
              title="Active Patients"
              value={activePatients.length}
              icon={UserRound}
              color="bg-sky-600"
            />
            <StatCard
              title="Currently On Duty"
              value={assignmentsLoading ? "..." : onDutyCount}
              icon={Activity}
              color="bg-emerald-600"
            />
            <StatCard
              title="Available Staff"
              value={assignmentsLoading ? "..." : availableStaffCount}
              icon={Users}
              color="bg-indigo-600"
            />
            <StatCard
              title="Pending Cases"
              value={pendingPatients.length}
              icon={Hourglass}
              color="bg-violet-600"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <MapPin size={20} className="text-teal-600" />
            Staff Distribution by District
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Stethoscope size={20} className="text-teal-600" />
            Staff Categories
          </h3>
          <div className="h-[300px] w-full flex flex-col md:flex-row items-center">
            <div className="h-full w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3 pl-4">
              {categoryCounts.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px] font-medium">{entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet size={20} className="text-teal-600" />
              Recent Advance History
            </h3>
            <button
              onClick={() => setActiveTab('advances')}
              className="text-teal-600 dark:text-teal-400 text-sm font-bold hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {advancesLoading ? (
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
                      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">{a.staff_name}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{a.staff_designation} • {a.reason || 'No reason provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">Rs. {a.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{formatPKDate(a.advance_date)}</p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 min-w-[90px] justify-center",
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck size={20} className="text-teal-600" />
              Recent Admissions
            </h3>
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
            ) : recentAdmissions.length > 0 ? (
              recentAdmissions.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-lg">
                      {p.full_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">{p.full_name}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{p.medical_condition} • {p.district}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      p.status === 'Active' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : 
                      p.status === 'Pending' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" :
                      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}>
                      {p.status}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 italic text-sm">
                No patient records found in Supabase.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

