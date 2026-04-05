/**
 * Duty Roster Module
 * Manual shift assignment: staff → patient → day/night shift → date
 * Admin picks who works what shift, then payroll calculates from completed shifts
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Sun,
  Moon,
  Users,
  UserRound,
  Plus,
  X,
  Check,
  AlertCircle,
  Clock,
  CheckCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ClipboardList,
  TrendingUp,
  Loader2,
  BedDouble
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday } from 'date-fns';
import { Staff, Patient, DutyAssignment } from '../types';
import { dutyService } from '../services/dutyService';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// STAT CARD
// ============================================

const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
  <div className="bg-white dark:bg-slate-900 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className={cn("p-3 rounded-2xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  </div>
);

// ============================================
// STATUS BADGE
// ============================================

const ShiftStatusBadge = ({ status }: { status: DutyAssignment['status'] }) => {
  const styles: Record<string, string> = {
    assigned: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    confirmed: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    completed: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
    absent: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
    no_show: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    cancelled: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
  };
  const icons: Record<string, React.ReactNode> = {
    assigned: <Clock size={10} />,
    confirmed: <Check size={10} />,
    completed: <CheckCircle size={10} />,
    absent: <Ban size={10} />,
    no_show: <AlertCircle size={10} />,
    cancelled: <X size={10} />,
  };
  return (
    <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase", styles[status])}>
      {icons[status]}
      {status}
    </span>
  );
};

// ============================================
// DUTY ROSTER MODULE
// ============================================

export const DutyRosterModule = ({ staff, patients }: { staff: Staff[], patients: Patient[] }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');

  const dateStr = selectedDate.toISOString().split('T')[0];

  // Fetch today's roster
  const { data: todayRoster, isLoading, refetch } = useQuery({
    queryKey: ['duty-roster', dateStr],
    queryFn: () => dutyService.getTodayRoster(dateStr),
    staleTime: 60 * 1000,
  });

  // Summary stats
  const summary = todayRoster ? {
    total: todayRoster.dayShifts.length + todayRoster.nightShifts.length,
    day: todayRoster.dayShifts.length,
    night: todayRoster.nightShifts.length,
    completed: [...todayRoster.dayShifts, ...todayRoster.nightShifts].filter(a => a.status === 'completed').length,
  } : { total: 0, day: 0, night: 0, completed: 0 };

  // Filter patients
  const filteredPatients = patients.filter(p => {
    if (searchQuery && !p.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const navigateDate = (direction: number) => {
    setSelectedDate(prev => addDays(prev, direction));
  };

  const getAssignmentForPatient = (patientId: string, shiftType: 'day' | 'night') => {
    const shifts = shiftType === 'day' ? todayRoster?.dayShifts || [] : todayRoster?.nightShifts || [];
    return shifts.find(a => a.patient_id === patientId);
  };

  const handleDeleteAssignment = async (assignment: DutyAssignment) => {
    try {
      await dutyService.delete(assignment.id);
      toast.success('Assignment removed');
      refetch();
    } catch {
      toast.error('Failed to remove assignment');
    }
  };

  const handleStatusChange = async (assignment: DutyAssignment, newStatus: DutyAssignment['status']) => {
    try {
      await dutyService.update(assignment.id, { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      refetch();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Duty Roster</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Assign staff to patient day/night shifts and track completion for payroll
          </p>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>

          <div className="text-center">
            <div className="flex items-center gap-2 justify-center">
              <Calendar size={18} className="text-teal-600" />
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-xs text-teal-600 dark:text-teal-400 font-bold mt-1 hover:underline"
            >
              {isToday(selectedDate) ? 'Today' : 'Go to Today'}
            </button>
          </div>

          <button
            onClick={() => navigateDate(1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Assignments"
          value={summary.total}
          subtitle={`${isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d')}`}
          icon={ClipboardList}
          color="bg-teal-600"
        />
        <StatCard
          title="Day Shifts"
          value={summary.day}
          subtitle="7:00 AM – 7:00 PM"
          icon={Sun}
          color="bg-amber-500"
        />
        <StatCard
          title="Night Shifts"
          value={summary.night}
          subtitle="7:00 PM – 7:00 AM"
          icon={Moon}
          color="bg-indigo-600"
        />
        <StatCard
          title="Completed"
          value={summary.completed}
          subtitle={summary.total > 0 ? `${Math.round(summary.completed / summary.total * 100)}% done` : ''}
          icon={CheckCircle}
          color="bg-emerald-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-[32px] border border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filters:</span>
        </div>

        <select
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm"
        >
          <option value="all">All Shifts</option>
          <option value="day">Day Shift Only</option>
          <option value="night">Night Shift Only</option>
        </select>

        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white shadow-sm"
          />
        </div>
      </div>

      {/* Patient Shift Assignment Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-600" size={32} />
          <span className="ml-3 text-slate-500 font-medium">Loading roster...</span>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-16 text-center">
          <BedDouble size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Patients Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Register patients first, then assign them shifts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPatients.filter(p => {
            if (shiftFilter === 'day') return p.needs_day_shift;
            if (shiftFilter === 'night') return p.needs_night_shift;
            return true;
          }).map(patient => {
            const dayAssignment = getAssignmentForPatient(patient.id, 'day');
            const nightAssignment = getAssignmentForPatient(patient.id, 'night');
            const dayStaff = staff.find(s => s.id === dayAssignment?.staff_id);
            const nightStaff = staff.find(s => s.id === nightAssignment?.staff_id);

            return (
              <div
                key={patient.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                {/* Patient header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-black text-lg">
                        {patient.full_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{patient.full_name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {patient.medical_condition} • {patient.district}
                        </p>
                        <p className="text-xs text-teal-600 dark:text-teal-400 font-bold mt-0.5">
                          {patient.service_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                        patient.status === 'Active'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                      )}>
                        {patient.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shift columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
                  {/* Day Shift Column */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                          <Sun size={14} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase">Day Shift</span>
                        <span className="text-[10px] text-slate-400 font-medium">7:00 AM – 7:00 PM</span>
                      </div>
                      {!dayAssignment && patient.needs_day_shift && (
                        <button
                          onClick={() => { setSelectedPatient(patient); setShowAssignModal(true); }}
                          className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                          title="Assign Staff"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>

                    {dayAssignment ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
                            {dayStaff?.full_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{dayStaff?.full_name || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-500">{dayStaff?.designation || ''}</p>
                          </div>
                          <ShiftStatusBadge status={dayAssignment.status} />
                        </div>

                        {/* Status actions */}
                        <div className="flex gap-2">
                          {dayAssignment.status === 'assigned' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(dayAssignment, 'confirmed')}
                                className="flex-1 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                              >
                                ✓ Confirmed
                              </button>
                              <button
                                onClick={() => handleStatusChange(dayAssignment, 'absent')}
                                className="py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition-colors"
                              >
                                Absent
                              </button>
                            </>
                          )}
                          {dayAssignment.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusChange(dayAssignment, 'completed')}
                              className="flex-1 py-1.5 bg-teal-600 text-white rounded-lg text-[10px] font-bold hover:bg-teal-700 transition-colors"
                            >
                              ✓ Complete Shift → Payroll Credit
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAssignment(dayAssignment)}
                            className="py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
                        <p className="text-xs text-slate-400 font-medium">
                          {patient.needs_day_shift ? 'No staff assigned' : 'Day shift not needed'}
                        </p>
                        {patient.needs_day_shift && (
                          <button
                            onClick={() => { setSelectedPatient(patient); setShowAssignModal(true); }}
                            className="mt-2 text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline"
                          >
                            + Assign Staff
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Night Shift Column */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <Moon size={14} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase">Night Shift</span>
                        <span className="text-[10px] text-slate-400 font-medium">7:00 PM – 7:00 AM</span>
                      </div>
                      {!nightAssignment && patient.needs_night_shift && (
                        <button
                          onClick={() => { setSelectedPatient(patient); setShowAssignModal(true); }}
                          className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          title="Assign Staff"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>

                    {nightAssignment ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                            {nightStaff?.full_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{nightStaff?.full_name || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-500">{nightStaff?.designation || ''}</p>
                          </div>
                          <ShiftStatusBadge status={nightAssignment.status} />
                        </div>

                        {/* Status actions */}
                        <div className="flex gap-2">
                          {nightAssignment.status === 'assigned' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(nightAssignment, 'confirmed')}
                                className="flex-1 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                              >
                                ✓ Confirmed
                              </button>
                              <button
                                onClick={() => handleStatusChange(nightAssignment, 'absent')}
                                className="py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition-colors"
                              >
                                Absent
                              </button>
                            </>
                          )}
                          {nightAssignment.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusChange(nightAssignment, 'completed')}
                              className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors"
                            >
                              ✓ Complete Shift → Payroll Credit
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAssignment(nightAssignment)}
                            className="py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
                        <p className="text-xs text-slate-400 font-medium">
                          {patient.needs_night_shift ? 'No staff assigned' : 'Night shift not needed'}
                        </p>
                        {patient.needs_night_shift && (
                          <button
                            onClick={() => { setSelectedPatient(patient); setShowAssignModal(true); }}
                            className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                          >
                            + Assign Staff
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Staff Modal */}
      <AssignStaffModal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setSelectedPatient(null); }}
        patient={selectedPatient}
        staff={staff}
        date={dateStr}
        onSuccess={() => {
          refetch();
          setShowAssignModal(false);
          setSelectedPatient(null);
        }}
      />
    </div>
  );
};

// ============================================
// ASSIGN STAFF MODAL
// ============================================

interface AssignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  staff: Staff[];
  date: string;
  onSuccess: () => void;
}

const AssignStaffModal: React.FC<AssignStaffModalProps> = ({ isOpen, onClose, patient, staff, date, onSuccess }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [shiftType, setShiftType] = useState<'day' | 'night'>('day');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !patient) {
      toast.error('Please select a staff member');
      return;
    }

    setIsSubmitting(true);
    try {
      await dutyService.create({
        patient_id: patient.id,
        staff_id: selectedStaffId,
        shift_type: shiftType,
        duty_date: date,
        status: 'assigned',
        notes: notes || undefined,
        is_payroll_processed: false,
      });
      toast.success(`${selectedStaff.full_name} assigned to ${shiftType} shift`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !patient) return null;

  const activeStaff = staff.filter(s => s.status === 'Active');

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-teal-600 to-sky-600 text-white">
          <div>
            <h2 className="text-xl font-black tracking-tight">Assign Staff to Shift</h2>
            <p className="text-teal-100 text-xs font-medium">
              {patient.full_name} • {format(new Date(date), 'MMM d, yyyy')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Patient info */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold">
                {patient.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{patient.full_name}</p>
                <p className="text-[10px] text-slate-500">{patient.service_type} • {patient.district}</p>
              </div>
            </div>
          </div>

          {/* Shift type */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Shift Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShiftType('day')}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border-2 transition-all font-bold text-sm",
                  shiftType === 'day'
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-amber-300"
                )}
              >
                <Sun size={16} />
                Day (7AM-7PM)
              </button>
              <button
                type="button"
                onClick={() => setShiftType('night')}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border-2 transition-all font-bold text-sm",
                  shiftType === 'night'
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-300"
                )}
              >
                <Moon size={16} />
                Night (7PM-7AM)
              </button>
            </div>
          </div>

          {/* Staff selection */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Staff Member *
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
              required
            >
              <option value="">Select staff member...</option>
              {activeStaff
                .sort((a, b) => a.full_name.localeCompare(b.full_name))
                .map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.assigned_id}) — {s.designation}
                  </option>
                ))}
            </select>
          </div>

          {/* Staff info card */}
          {selectedStaff && (
            <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-100 dark:border-teal-800">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] font-bold text-teal-400 uppercase">Rate</p>
                  <p className="text-sm font-black text-teal-900 dark:text-teal-400">Rs {selectedStaff.shift_rate || Math.round(selectedStaff.salary / 30)}/shift</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-teal-400 uppercase">District</p>
                  <p className="text-sm font-black text-teal-900 dark:text-teal-400">{selectedStaff.official_district || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-teal-400 uppercase">Exp</p>
                  <p className="text-sm font-black text-teal-900 dark:text-teal-400">{selectedStaff.experience_years}yr</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions for this shift..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white min-h-[80px] resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !selectedStaffId}
            className="w-full py-4 bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-200 dark:shadow-teal-900/20 hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <CheckCircle size={18} />
                Assign to {shiftType === 'day' ? 'Day' : 'Night'} Shift
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
