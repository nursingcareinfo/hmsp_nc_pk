/**
 * Attendance Calendar Modal
 * Shows calendar with color-coded attendance for a staff member
 * Green = Present, Red = Absent, Yellow = Late, Orange = Half Day, Blue = On Leave
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  MinusCircle,
  Calendar,
  TrendingUp,
  DollarSign,
  Sun,
  Moon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns';
import { Staff } from '../types';
import { attendanceService, AttendanceRecord, AttendanceSummary } from '../services/attendanceService';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  present: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800',
    label: 'Present',
    icon: <CheckCircle size={10} />,
  },
  absent: {
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800',
    label: 'Absent',
    icon: <XCircle size={10} />,
  },
  late: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800',
    label: 'Late',
    icon: <Clock size={10} />,
  },
  half_day: {
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800',
    label: 'Half Day',
    icon: <MinusCircle size={10} />,
  },
  on_leave: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800',
    label: 'On Leave',
    icon: <Calendar size={10} />,
  },
};

interface AttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
}

export const AttendanceCalendarModal: React.FC<AttendanceCalendarModalProps> = ({ isOpen, onClose, staff }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Map<string, AttendanceRecord>>(new Map());
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add empty cells for days before month starts
  const startDay = getDay(monthStart);
  const emptyCells = Array.from({ length: startDay }, (_, i) => i);

  const navigateMonth = (direction: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // Fetch attendance data when modal opens or month changes
  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, year, month]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [data, sum] = await Promise.all([
        attendanceService.getCalendarData(staff.id, year, month),
        attendanceService.calculateMonthlySummary(staff, year, month),
      ]);
      setCalendarData(data);
      setSummary(sum);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAttendance = async (date: string, status: string) => {
    try {
      await attendanceService.markAttendance(staff.id, date, status as any, {
        markedBy: 'admin',
      });
      toast.success(`Marked ${STATUS_CONFIG[status]?.label || status}`);
      fetchData();
      setShowStatusPicker(false);
      setSelectedDate(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark attendance');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => { onClose(); setShowStatusPicker(false); setSelectedDate(null); }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-600 to-sky-600 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black tracking-tight">Attendance Calendar</h2>
              <p className="text-teal-100 text-xs font-medium">{staff.full_name} • {staff.assigned_id}</p>
            </div>
            <button onClick={() => { onClose(); setShowStatusPicker(false); setSelectedDate(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-teal-100 dark:border-teal-900/30 border-t-teal-600 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-slate-500">Loading attendance...</span>
            </div>
          ) : (
            <>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" />
                </button>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {format(viewDate, 'MMMM yyyy')}
                </h3>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <ChevronRight size={18} className="text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="mb-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Empty cells */}
                <div className="grid grid-cols-7 gap-1">
                  {emptyCells.map(i => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}

                  {/* Day cells */}
                  {daysInMonth.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const record = calendarData.get(dateStr);
                    const statusConfig = record ? STATUS_CONFIG[record.status] : null;
                    const isTodayDate = isToday(day);

                    return (
                      <button
                        key={dateStr}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setShowStatusPicker(true);
                        }}
                        className={cn(
                          "aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all border-2 hover:scale-105 relative",
                          statusConfig
                            ? cn(statusConfig.bg, statusConfig.color)
                            : "border-transparent text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800",
                          isTodayDate && !statusConfig && "border-teal-500 text-teal-600",
                          isTodayDate && statusConfig && "ring-2 ring-teal-500/30"
                        )}
                      >
                        <span>{format(day, 'd')}</span>
                        {statusConfig && (
                          <span className="mt-0.5">
                            {statusConfig.icon}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-4">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <div key={key} className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold", config.bg, config.color)}>
                    {config.icon}
                    {config.label}
                  </div>
                ))}
              </div>

              {/* Status Picker Modal */}
              {showStatusPicker && selectedDate && (
                <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                    Mark attendance for {format(new Date(selectedDate), 'MMMM d, yyyy')}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleMarkAttendance(selectedDate, key)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-bold",
                          config.bg, config.color,
                          "hover:scale-105"
                        )}
                      >
                        {config.icon}
                        {config.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { setShowStatusPicker(false); setSelectedDate(null); }}
                    className="w-full mt-3 py-2 text-xs text-slate-500 font-bold hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Monthly Summary */}
              {summary && summary.totalDays > 0 && (
                <div className="p-4 bg-gradient-to-r from-teal-50 to-sky-50 dark:from-teal-900/20 dark:to-sky-900/20 rounded-2xl border border-teal-100 dark:border-teal-800">
                  <h4 className="text-sm font-black text-teal-900 dark:text-teal-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <TrendingUp size={16} />
                    Monthly Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Present</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{summary.presentDays}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Absent</p>
                      <p className="text-lg font-black text-rose-600 dark:text-rose-400">{summary.absentDays}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Late</p>
                      <p className="text-lg font-black text-amber-600 dark:text-amber-400">{summary.lateDays}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center flex items-center gap-1 justify-center">
                      <Sun size={12} className="text-amber-500" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Day Shifts</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white ml-1">{summary.dayShifts}</p>
                    </div>
                    <div className="text-center flex items-center gap-1 justify-center">
                      <Moon size={12} className="text-indigo-500" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Night Shifts</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white ml-1">{summary.nightShifts}</p>
                    </div>
                    <div className="text-center flex items-center gap-1 justify-center">
                      <DollarSign size={12} className="text-teal-500" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Est. Salary</p>
                      <p className="text-sm font-black text-teal-600 dark:text-teal-400 ml-1">
                        Rs {summary.estimatedSalary.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {summary && summary.totalDays === 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
                  <p className="text-sm text-slate-400">No attendance records for this month</p>
                  <p className="text-xs text-slate-300 dark:text-slate-500 mt-1">
                    Click any date to mark attendance
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
