import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  UserRound, 
  Search, 
  Plus, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  X,
  UserCheck,
  ArrowRight,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { useUIStore } from '../store';
import { dataService } from '../dataService';
import { Staff, Patient, District } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const StaffDraggable = ({ staff }: { staff: Staff }) => (
  <motion.div 
    drag
    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
    dragElastic={0.1}
    whileDrag={{ scale: 1.05, zIndex: 100, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm cursor-grab active:cursor-grabbing group hover:border-teal-500 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-sm group-hover:bg-teal-600 group-hover:text-white transition-colors">
        {staff.full_name.charAt(0)}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-900">{staff.full_name}</p>
        <p className="text-[10px] text-slate-500 font-medium">{staff.designation}</p>
      </div>
      <div className="ml-auto text-[10px] font-bold text-slate-400 uppercase">
        {staff.official_district.split(' ')[1] || staff.official_district}
      </div>
    </div>
  </motion.div>
);

const PatientDropZone = ({ patient, onDrop }: { patient: Patient, onDrop: (staffId: string) => void }) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        // In a real app, we'd get the staff ID from the drag event
        // For this demo, we'll simulate it
        toast.success(`Staff assigned to ${patient.full_name}`);
      }}
      className={cn(
        "p-6 rounded-[32px] border-2 border-dashed transition-all duration-300",
        isOver 
          ? "bg-teal-50 border-teal-500 scale-[1.02]" 
          : "bg-white border-slate-100 hover:border-slate-200"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 font-bold">
            {patient.full_name.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{patient.full_name}</h4>
            <p className="text-[10px] text-slate-500 font-medium">{patient.district}</p>
          </div>
        </div>
        <StatusBadge status={patient.status} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
          <Clock size={12} />
          {patient.service_type}
        </div>
        
        {patient.assigned_staff_id ? (
          <div className="flex items-center justify-between p-3 bg-teal-50 rounded-2xl border border-teal-100">
            <div className="flex items-center gap-2">
              <UserCheck size={14} className="text-teal-600" />
              <span className="text-xs font-bold text-teal-900">Caregiver Assigned</span>
            </div>
            <button className="text-[10px] font-bold text-teal-600 hover:underline">Change</button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-slate-400 gap-2">
            <Plus size={20} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Drop Staff Here</span>
          </div>
        )}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={cn(
    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
    status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
  )}>
    {status}
  </span>
);

// --- Module ---

export const SchedulingModule = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'assignments'>('assignments');

  useEffect(() => {
    dataService.getStaff().then(setStaff);
    dataService.getPatients().then(setPatients);
  }, []);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Care Scheduling</h2>
          <p className="text-slate-500 font-medium">Assign caregivers and manage patient visit rosters.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            <button 
              onClick={() => setView('assignments')}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", view === 'assignments' ? "bg-teal-600 text-white shadow-md" : "text-slate-400 hover:text-teal-600")}
            >
              Assignments
            </button>
            <button 
              onClick={() => setView('calendar')}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", view === 'calendar' ? "bg-teal-600 text-white shadow-md" : "text-slate-400 hover:text-teal-600")}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'assignments' ? (
          <motion.div 
            key="assignments"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-8"
          >
            {/* Staff Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Users size={16} className="text-teal-600" />
                    Available Staff
                  </h3>
                  <span className="text-[10px] font-bold bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">{staff.filter(s => s.status === 'Active').length}</span>
                </div>
                
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search staff..." 
                    className="w-full bg-slate-50 border-none rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {staff.filter(s => s.status === 'Active').map(s => (
                    <StaffDraggable key={s.id} staff={s} />
                  ))}
                </div>
              </div>
            </div>

            {/* Patients Grid */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <UserRound size={16} className="text-sky-600" />
                  Active Patient Cases
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Sort by:</span>
                  <select className="bg-transparent border-none text-[10px] font-bold text-teal-600 focus:ring-0 cursor-pointer">
                    <option>Urgency</option>
                    <option>District</option>
                    <option>Newest</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patients.filter(p => p.status === 'Active').map(p => (
                  <PatientDropZone key={p.id} patient={p} onDrop={() => {}} />
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="calendar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-teal-600 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-teal-600 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              <button className="px-6 py-2.5 bg-teal-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-teal-100 hover:scale-105 transition-all">
                Auto-Schedule Shifts
              </button>
            </div>

            <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-3xl overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-slate-50 p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {day}
                </div>
              ))}
              {days.map((day, i) => (
                <div 
                  key={day.toString()} 
                  className={cn(
                    "bg-white min-h-[140px] p-4 hover:bg-slate-50/50 transition-colors group",
                    !isSameDay(day, new Date()) && "text-slate-400"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={cn(
                      "text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                      isSameDay(day, new Date()) ? "bg-teal-600 text-white shadow-lg shadow-teal-100" : "text-slate-900"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {i % 5 === 0 && (
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {i % 3 === 0 && (
                      <div className="px-2 py-1 bg-teal-50 text-teal-600 rounded-lg text-[8px] font-bold border border-teal-100 flex items-center gap-1">
                        <UserCheck size={8} />
                        12 Staff On Duty
                      </div>
                    )}
                    {i % 4 === 0 && (
                      <div className="px-2 py-1 bg-sky-50 text-sky-600 rounded-lg text-[8px] font-bold border border-sky-100 flex items-center gap-1">
                        <Activity size={8} />
                        4 Emergency Visits
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
