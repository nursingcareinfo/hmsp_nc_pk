import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  LayoutDashboard,
  Users,
  UserRound,
  Calendar,
  Bell,
  Search,
  Plus,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  MapPin,
  Stethoscope,
  Activity,
  Phone,
  MessageSquare,
  MoreVertical,
  Filter,
  Download,
  ChevronRight,
  Clock,
  CheckCircle2,
  Sun,
  Moon,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUIStore } from './store';
import { dataService } from './dataService';

// Code-split heavy modules — loaded on-demand when tab is opened
const StaffModule = lazy(() => import('./components/StaffModule').then(m => ({ default: m.StaffModule })));
const PatientModule = lazy(() => import('./components/PatientModule').then(m => ({ default: m.PatientModule })));
const SchedulingModule = lazy(() => import('./components/SchedulingModule').then(m => ({ default: m.SchedulingModule })));
const PayrollModule = lazy(() => import('./components/PayrollModule').then(m => ({ default: m.PayrollModule })));
const AdvancesModule = lazy(() => import('./components/AdvancesModule').then(m => ({ default: m.AdvancesModule })));
const NotificationsModule = lazy(() => import('./components/NotificationsModule').then(m => ({ default: m.NotificationsModule })));
const MarketAnalysisModule = lazy(() => import('./components/MarketAnalysisModule').then(m => ({ default: m.MarketAnalysisModule })));
const HRManagementModule = lazy(() => import('./components/HRManagementModule').then(m => ({ default: m.HRManagementModule })));
import { AIChatAssistant } from './components/AIChatAssistant';
import { Logo } from './components/Logo';
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
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Toaster, toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2, Wallet } from 'lucide-react';
import { SUPER_ADMIN_EMAILS, DEMO_MODE } from './constants';

import { SettingsModule } from './components/SettingsModule';
import { AppUser } from './types';
import { SignIn } from './components/auth/SignIn';
import { SignUp } from './components/auth/SignUp';
import { supabase } from './lib/supabase';
import { DashboardModule } from './components/DashboardModule';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick,
  badge
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void,
  badge?: number
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative",
      active 
        ? "bg-teal-600 text-white shadow-lg shadow-teal-200 dark:shadow-teal-900/20" 
        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400"
    )}
  >
    <Icon size={20} className={cn(active ? "text-white" : "group-hover:scale-110 transition-transform")} />
    <span className="font-medium">{label}</span>
    {badge && badge > 0 && (
      <span className={cn(
        "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full",
        active ? "bg-white text-teal-600" : "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
      )}>
        {badge}
      </span>
    )}
    {active && (
      <motion.div 
        layoutId="sidebar-active"
        className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
      />
    )}
  </button>
);

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
      <div className={cn(
        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
        change > 0 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
      )}>
        {change > 0 ? "+" : ""}{change}%
        <TrendingUp size={12} className={change < 0 ? "rotate-180" : ""} />
      </div>
    </div>
    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
  </div>
);

// --- Main App ---

export default function App() {
  const { activeTab, setActiveTab, searchQuery, setSearchQuery, notifications, theme, toggleTheme } = useUIStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Helper to navigate and close sidebar on mobile
  const navigateToTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<'signIn' | 'signUp'>('signIn');

  // Helper to build AppUser from Supabase session
  const buildAppUser = (user: any): AppUser => ({
    uid: user.id,
    email: user.email || '',
    displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    role: user.user_metadata?.role || 'viewer',
    photoURL: user.user_metadata?.avatar_url || undefined,
    createdAt: user.created_at,
    lastLogin: new Date().toISOString()
  });

  // Supabase Auth Listener — single source of truth for auth state
  useEffect(() => {
    let mounted = true;

    const handleSession = (session: any) => {
      if (!mounted) return;
      if (session?.user) {
        setCurrentUser(buildAppUser(session.user));
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    };

    // Check existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      localStorage.removeItem('nc_demo_staff');
      localStorage.removeItem('nc_demo_patients');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  // React Query for cached data fetching with deduplication
  const { data: staffData = [], isLoading: isStaffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: dataService.getStaff,
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: patientData = [], isLoading: isPatientLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: dataService.getPatients,
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // No local state duplication — pass React Query data directly to components.
  // StaffModule and PatientModule fetch their own data via internal useQuery.
  // DashboardModule, SchedulingModule, PayrollModule, AdvancesModule receive data as props.

  const isLoading = isStaffLoading || isPatientLoading;

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className={cn(
      "min-h-screen flex font-sans selection:bg-teal-100 selection:text-teal-900 transition-colors duration-500",
      theme === 'dark' ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-900"
    )}>
      <Toaster position="top-right" richColors theme={theme} />
      
      {/* Sidebar — desktop: hover-based, mobile: toggle-based */}
      <aside
        className={cn(
          "group fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out",
          // Desktop (lg+): 2px trigger on left edge, expand on hover
          "hidden lg:block lg:w-2 lg:bg-transparent lg:hover:w-80",
          // Mobile (below lg): fixed overlay, controlled by isSidebarOpen
          "block lg:hidden w-64 -translate-x-full",
          isSidebarOpen && "lg:hidden translate-x-0 w-64"
        )}
        onMouseEnter={() => {
          // Only on desktop (screen lg+)
          if (window.innerWidth >= 1024) setIsSidebarOpen(true);
        }}
        onMouseLeave={() => {
          if (window.innerWidth >= 1024) setIsSidebarOpen(false);
        }}
      >
        {/* Mobile overlay backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 lg:hidden z-[-1]"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <div className={cn(
          "h-full flex flex-col p-6 transition-opacity duration-300 delay-100",
          // Desktop: show on hover
          "lg:opacity-0 lg:group-hover:opacity-100",
          // Mobile: show when isSidebarOpen is true
          "opacity-0 group-[.translate-x-0]:opacity-100",
          isSidebarOpen && "opacity-100",
          theme === 'dark' ? "bg-slate-900 border-r border-slate-800" : "bg-white border-r border-slate-100",
          "rounded-r-3xl shadow-2xl"
        )}>
          <div className="mb-12">
            <Logo theme={theme} showText={true} />
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => navigateToTab('dashboard')} 
            />
            <SidebarItem 
              icon={Users} 
              label="Staff Management" 
              active={activeTab === 'staff'} 
              onClick={() => navigateToTab('staff')} 
            />
            <SidebarItem 
              icon={UserRound} 
              label="Patient Care" 
              active={activeTab === 'patients'} 
              onClick={() => navigateToTab('patients')} 
            />
            <SidebarItem
              icon={Calendar}
              label="Scheduling"
              active={activeTab === 'scheduling'}
              onClick={() => navigateToTab('scheduling')}
            />
            <SidebarItem
              icon={Users}
              label="HR Management"
              active={activeTab === 'hr'}
              onClick={() => navigateToTab('hr')}
            />
            <SidebarItem
              icon={DollarSign}
              label="Payroll"
              active={activeTab === 'payroll'} 
              onClick={() => navigateToTab('payroll')}
            />
            <SidebarItem
              icon={Wallet}
              label="Advances"
              active={activeTab === 'advances'}
              onClick={() => navigateToTab('advances')}
            />
            <SidebarItem
              icon={Bell}
              label="Notifications" 
              active={activeTab === 'notifications'} 
              onClick={() => navigateToTab('notifications')} 
              badge={unreadNotifications}
            />
            <SidebarItem 
              icon={Globe} 
              label="Market Analysis" 
              active={activeTab === 'market'} 
              onClick={() => navigateToTab('market')} 
            />
          </nav>

          <div className="mt-auto space-y-2">
            {currentUser?.role === 'admin' && (
              <SidebarItem 
                icon={Settings} 
                label="Settings" 
                active={activeTab === 'settings'} 
                onClick={() => navigateToTab('settings')} 
              />
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50/10 transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className={cn(
          "backdrop-blur-md border-b px-8 py-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 sticky top-0 z-40 transition-colors",
          theme === 'dark' ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-100"
        )}>
          {/* Left: hamburger + user info */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn("p-2 rounded-lg lg:hidden", theme === 'dark' ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-50 text-slate-500")}
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex flex-col text-right">
              <span className={cn("text-sm font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>
                {currentUser?.displayName || 'Admin Portal'}
              </span>
              <span className="text-[10px] font-bold text-teal-600 uppercase">
                {currentUser?.role === 'admin' ? (SUPER_ADMIN_EMAILS.includes(currentUser.email || '') ? 'Super Admin' : 'Admin') : currentUser?.role || 'Viewer'}
              </span>
            </div>
          </div>

          {/* Center: search */}
          <div className="relative group hidden md:flex justify-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search staff, patients, or records... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "border-none rounded-2xl pl-10 pr-4 py-2.5 w-full max-w-lg text-sm focus:ring-2 focus:ring-teal-500 transition-all",
                theme === 'dark' ? "bg-slate-800 text-white placeholder:text-slate-500" : "bg-slate-50 text-slate-900"
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
              <kbd className={cn("px-1.5 py-0.5 border rounded text-[10px] font-bold", theme === 'dark' ? "bg-slate-700 border-slate-600 text-slate-400" : "bg-white border-slate-200 text-slate-400")}>Ctrl</kbd>
              <kbd className={cn("px-1.5 py-0.5 border rounded text-[10px] font-bold", theme === 'dark' ? "bg-slate-700 border-slate-600 text-slate-400" : "bg-white border-slate-200 text-slate-400")}>K</kbd>
            </div>
          </div>

          {/* Right: theme toggle + avatar */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={cn(
                "p-2.5 rounded-xl transition-all duration-300",
                theme === 'dark' ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              )}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 p-0.5 shadow-lg shadow-teal-100">
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                <img 
                  src={currentUser?.photoURL || "https://picsum.photos/seed/admin/100/100"} 
                  alt="Admin" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {isAuthLoading ? (
              <motion.div 
                key="auth-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center gap-4"
              >
                <div className="w-12 h-12 border-4 border-teal-100 dark:border-teal-900/30 border-t-teal-600 rounded-full animate-spin" />
                <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Authenticating...</p>
              </motion.div>
            ) : !currentUser ? (
              <motion.div 
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex items-center justify-center p-4"
              >
                {authView === 'signIn' ? (
                  <SignIn 
                    theme={theme} 
                    onSuccess={() => {}} 
                    onToggleView={() => setAuthView('signUp')} 
                  />
                ) : (
                  <SignUp 
                    theme={theme} 
                    onSuccess={() => setAuthView('signIn')} 
                    onToggleView={() => setAuthView('signIn')} 
                  />
                )}
              </motion.div>
            ) : isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center gap-4"
              >
                <div className="w-12 h-12 border-4 border-teal-100 dark:border-teal-900/30 border-t-teal-600 rounded-full animate-spin" />
                <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading dashboard data...</p>
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'dashboard' && (
                  <DashboardModule 
                    staff={staffData} 
                    patients={patientData} 
                    setActiveTab={setActiveTab} 
                    isLoading={isLoading}
                  />
                )}
                <Suspense fallback={
                  <div className="flex items-center justify-center py-32">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 size={32} className="animate-spin text-teal-600" />
                      <p className="text-sm text-slate-400 font-medium">Loading {activeTab}...</p>
                    </div>
                  </div>
                }>
                  {activeTab === 'staff' && <StaffModule />}
                  {activeTab === 'patients' && <PatientModule />}
                  {activeTab === 'scheduling' && <SchedulingModule staff={staffData} patients={patientData} />}
                  {activeTab === 'hr' && <HRManagementModule />}
                  {activeTab === 'payroll' && <PayrollModule staff={staffData} />}
                  {activeTab === 'advances' && <AdvancesModule staff={staffData} />}
                  {activeTab === 'notifications' && <NotificationsModule />}
                  {activeTab === 'market' && <MarketAnalysisModule />}
                  {activeTab === 'settings' && <SettingsModule currentUser={currentUser} />}
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      <AIChatAssistant />

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-14 h-14 bg-teal-600 text-white rounded-2xl shadow-2xl shadow-teal-200 flex items-center justify-center hover:scale-110 hover:rotate-90 transition-all duration-300 group">
          <Plus size={28} />
          <div className="absolute right-full mr-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">
              Quick Actions
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
