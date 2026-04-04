import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUIStore } from './store';
import { dataService } from './dataService';
import { Staff, Patient, Notification } from './types';
import { StaffModule } from './components/StaffModule';
import { PatientModule } from './components/PatientModule';
import { SchedulingModule } from './components/SchedulingModule';
import { PayrollModule } from './components/PayrollModule';
import { NotificationsModule } from './components/NotificationsModule';
import { AIChatAssistant } from './components/AIChatAssistant';
import { Logo } from './components/Logo';
import { SupabaseStatus } from './components/SupabaseStatus';
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
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { geminiService } from './services/geminiService';
import { Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
        ? "bg-teal-600 text-white shadow-lg shadow-teal-200" 
        : "text-slate-500 hover:bg-slate-50 hover:text-teal-600"
    )}
  >
    <Icon size={20} className={cn(active ? "text-white" : "group-hover:scale-110 transition-transform")} />
    <span className="font-medium">{label}</span>
    {badge && badge > 0 && (
      <span className={cn(
        "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full",
        active ? "bg-white text-teal-600" : "bg-teal-100 text-teal-600"
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
  <div className="bg-white/80 backdrop-blur-md border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
      <div className={cn(
        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
        change > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
      )}>
        {change > 0 ? "+" : ""}{change}%
        <TrendingUp size={12} className={change < 0 ? "rotate-180" : ""} />
      </div>
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

// --- Modules ---

const DashboardModule = ({ staff, patients, setActiveTab }: { staff: Staff[], patients: Patient[], setActiveTab: (tab: string) => void }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const generateInsights = async () => {
      setIsGenerating(true);
      try {
        const prompt = `Based on the following data, provide a brief (3-4 bullet points) strategic summary for NursingCare.pk:
          - Total Staff: ${staff.length}
          - Active Patients: ${patients.filter(p => p.status === 'Active').length}
          - Districts: ${staff.map(s => s.official_district).join(', ')}
          - Designations: ${staff.map(s => s.designation).join(', ')}
          Focus on staff distribution, patient care capacity, and potential growth areas in Karachi.`;
        const result = await geminiService.fastTask(prompt);
        setInsights(result);
      } catch (error) {
        console.error('Failed to generate insights:', error);
      } finally {
        setIsGenerating(false);
      }
    };
    generateInsights();
  }, [staff, patients]);

  const districtData = [
    { name: 'Central', count: 45 },
    { name: 'East', count: 78 },
    { name: 'South', count: 112 },
    { name: 'West', count: 56 },
    { name: 'Korangi', count: 89 },
    { name: 'Malir', count: 42 },
    { name: 'Keamari', count: 31 },
  ];

  const designationData = [
    { name: 'Doctors', value: 12 },
    { name: 'Nurses', value: 156 },
    { name: 'Attendants', value: 245 },
    { name: 'Others', value: 40 },
  ];

  const COLORS = ['#0d9488', '#0ea5e9', '#6366f1', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* AI Insights and Supabase Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-r from-teal-600 to-sky-600 p-1 rounded-[32px] shadow-lg shadow-teal-100">
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-[30px] flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-inner shrink-0">
                <Sparkles size={32} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-black text-teal-900 uppercase tracking-widest">NursingCare AI Insights</h3>
                  <div className="px-2 py-0.5 bg-teal-100 text-teal-600 rounded-full text-[10px] font-bold uppercase">Beta</div>
                </div>
                {isGenerating ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-sm font-medium italic">Analyzing current data trends...</span>
                  </div>
                ) : insights ? (
                  <div className="prose prose-sm max-w-none prose-teal">
                    <ReactMarkdown>{insights}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No insights available at this time.</p>
                )}
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shrink-0"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-[32px] shadow-sm overflow-hidden h-full">
          <SupabaseStatus />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          title="Monthly Revenue" 
          value="PKR 4.2M" 
          change={15} 
          icon={TrendingUp} 
          color="bg-indigo-600" 
        />
        <StatCard 
          title="Staff On Duty" 
          value={staff.filter(s => s.status === 'Active').length} 
          change={-2} 
          icon={Activity} 
          color="bg-violet-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-900">Recent Staff Members</h3>
            <button 
              onClick={() => setActiveTab('staff')}
              className="text-teal-600 text-sm font-bold hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {staff.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-lg">
                    {s.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{s.full_name}</h4>
                    <p className="text-sm text-slate-500">{s.designation} • {s.official_district}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-slate-900">{s.assigned_id}</p>
                    <p className="text-xs text-slate-400">Staff ID</p>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    s.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {s.status}
                  </div>
                </div>
              </div>
            ))}
            {staff.length === 0 && (
              <div className="text-center py-8 text-slate-400 italic text-sm">No staff records found.</div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-900">Recent Admissions</h3>
            <button 
              onClick={() => setActiveTab('patients')}
              className="text-teal-600 text-sm font-bold hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {patients.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-lg">
                    {p.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{p.full_name}</h4>
                    <p className="text-sm text-slate-500">{p.medical_condition} • {p.district}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-slate-900">{format(new Date(p.admission_date), 'MMM dd, yyyy')}</p>
                    <p className="text-xs text-slate-400">Admission Date</p>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    p.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {p.status}
                  </div>
                </div>
              </div>
            ))}
            {patients.length === 0 && (
              <div className="text-center py-8 text-slate-400 italic text-sm">No patient records found.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Staff Distribution by District</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Staff by Designation</h3>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={designationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {designationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3 ml-4">
              {designationData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-sm text-slate-600 font-medium">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const { activeTab, setActiveTab, searchQuery, setSearchQuery, notifications, theme, toggleTheme } = useUIStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Test connection first
        const connection = await dataService.testConnection();
        if (connection.success) {
          toast.success(connection.message);
        } else {
          toast.error(connection.message);
        }

        const [staffData, patientData] = await Promise.all([
          dataService.getStaff(),
          dataService.getPatients()
        ]);
        setStaff(staffData);
        setPatients(patientData);
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className={cn(
      "min-h-screen flex font-sans selection:bg-teal-100 selection:text-teal-900 transition-colors duration-500",
      theme === 'dark' ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-900"
    )}>
      <Toaster position="top-right" richColors theme={theme} />
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out lg:relative",
        theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100",
        isSidebarOpen ? "w-72" : "w-0 lg:w-20 overflow-hidden"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="mb-12">
            <Logo theme={theme} showText={isSidebarOpen} />
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <SidebarItem 
              icon={Users} 
              label="Staff Management" 
              active={activeTab === 'staff'} 
              onClick={() => setActiveTab('staff')} 
            />
            <SidebarItem 
              icon={UserRound} 
              label="Patient Care" 
              active={activeTab === 'patients'} 
              onClick={() => setActiveTab('patients')} 
            />
            <SidebarItem 
              icon={Calendar} 
              label="Scheduling" 
              active={activeTab === 'scheduling'} 
              onClick={() => setActiveTab('scheduling')} 
            />
            <SidebarItem 
              icon={DollarSign} 
              label="Payroll" 
              active={activeTab === 'payroll'} 
              onClick={() => setActiveTab('payroll')} 
            />
            <SidebarItem 
              icon={Bell} 
              label="Notifications" 
              active={activeTab === 'notifications'} 
              onClick={() => setActiveTab('notifications')} 
              badge={unreadNotifications}
            />
          </nav>

          <div className="mt-auto space-y-2">
            <SidebarItem 
              icon={Settings} 
              label="Settings" 
              active={false} 
              onClick={() => {}} 
            />
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50/10 transition-all">
              <LogOut size={20} />
              {isSidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className={cn(
          "backdrop-blur-md border-b px-8 py-4 flex items-center justify-between sticky top-0 z-40 transition-colors",
          theme === 'dark' ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-100"
        )}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn("p-2 rounded-lg lg:hidden", theme === 'dark' ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-50 text-slate-500")}
            >
              <Menu size={20} />
            </button>
            <div className="relative group hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search staff, patients, or records... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "border-none rounded-2xl pl-10 pr-4 py-2.5 w-80 lg:w-96 text-sm focus:ring-2 focus:ring-teal-500 transition-all",
                  theme === 'dark' ? "bg-slate-800 text-white placeholder:text-slate-500" : "bg-slate-50 text-slate-900"
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <kbd className={cn("px-1.5 py-0.5 border rounded text-[10px] font-bold", theme === 'dark' ? "bg-slate-700 border-slate-600 text-slate-400" : "bg-white border-slate-200 text-slate-400")}>Ctrl</kbd>
                <kbd className={cn("px-1.5 py-0.5 border rounded text-[10px] font-bold", theme === 'dark' ? "bg-slate-700 border-slate-600 text-slate-400" : "bg-white border-slate-200 text-slate-400")}>K</kbd>
              </div>
            </div>
          </div>

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
            <div className="hidden sm:flex flex-col text-right">
              <span className={cn("text-sm font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>Admin Portal</span>
              <span className="text-[10px] font-bold text-teal-600 uppercase">Super Admin</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 p-0.5 shadow-lg shadow-teal-100">
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                <img 
                  src="https://picsum.photos/seed/admin/100/100" 
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
            {isLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center gap-4"
              >
                <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Loading dashboard data...</p>
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'dashboard' && <DashboardModule staff={staff} patients={patients} setActiveTab={setActiveTab} />}
                {activeTab === 'staff' && <StaffModule />}
                {activeTab === 'patients' && <PatientModule />}
                {activeTab === 'scheduling' && <SchedulingModule />}
                {activeTab === 'payroll' && <PayrollModule staff={staff} />}
                {activeTab === 'notifications' && <NotificationsModule />}
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
