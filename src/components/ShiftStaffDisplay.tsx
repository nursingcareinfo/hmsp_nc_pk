/**
 * Shift Staff Display Component
 * Shows assigned staff with rate per shift and an Attendance button
 * that opens a popup modal with monthly attendance calendar + salary calculation.
 */
import React, { useState, useEffect } from 'react';
import { Sun, Moon, UserPlus, X, CheckCircle, Clock, XCircle, CalendarDays, CircleDollarSign, MinusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, Staff } from '../types';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AssignedStaffInfo {
  staff: Staff;
  rate: number;
  notes?: string;
}

interface AttendanceRecord {
  date: string;
  status: string;
}

/** Format number with PKR convention: Rs. 1,300 */
function fmt(amount: number) {
  return `Rs. ${amount.toLocaleString('en-PK')}`;
}

/** Compact: 1,300/shift */
function fmtShort(amount: number) {
  return `${amount.toLocaleString('en-PK')}/shift`;
}

/* ─── Attendance Modal ─────────────────────────────────────────────── */

const AttendanceModal = ({
  staff,
  rate,
  records,
  onClose,
}: {
  staff: Staff;
  rate: number;
  records: AttendanceRecord[];
  onClose: () => void;
}) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const recordMap = new Map(records.map(r => [r.date, r.status]));

  const statusColor = (status: string | undefined) => {
    if (!status) return 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600';
    switch (status) {
      case 'present': return 'bg-emerald-500 text-white';
      case 'late': return 'bg-amber-400 text-white';
      case 'half_day': return 'bg-sky-400 text-white';
      case 'absent': return 'bg-rose-500 text-white';
      case 'on_leave': return 'bg-slate-400 text-white';
      default: return 'bg-slate-200 dark:bg-slate-700 text-slate-400';
    }
  };

  // Salary calculation
  const presentDays = records.filter(r => r.status === 'present').length;
  const lateDays = records.filter(r => r.status === 'late').length;
  const halfDays = records.filter(r => r.status === 'half_day').length;
  const absentDays = records.filter(r => r.status === 'absent').length;
  const leaveDays = records.filter(r => r.status === 'on_leave').length;

  // Present = full rate, Late = full rate, Half Day = half rate, Absent/Leave = 0
  const earnedFromPresent = presentDays * rate;
  const earnedFromLate = lateDays * rate;
  const earnedFromHalf = halfDays * Math.round(rate / 2);
  const totalEarned = earnedFromPresent + earnedFromLate + earnedFromHalf;
  const totalDays = records.length;
  const workingDays = daysInMonth; // approximate

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-6 pt-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{staff.full_name}</h3>
            <p className="text-xs text-slate-500">{staff.role || 'Staff'} — {format(today, 'MMMM yyyy')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 px-6 text-[10px] text-slate-500 mb-3">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Present</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Late</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400" /> Half Day</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Absent</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-400" /> On Leave</span>
        </div>

        {/* Calendar Grid */}
        <div className="px-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="grid grid-cols-7 gap-0.5">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
              ))}
              {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const status = recordMap.get(dateStr);
                const isToday = day === today.getDate();
                return (
                  <div
                    key={day}
                    className={cn(
                      "text-center text-[11px] font-medium py-1 rounded-md cursor-default",
                      status ? statusColor(status) : 'text-slate-400 dark:text-slate-500',
                      isToday && !status && 'ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-slate-800'
                    )}
                    title={`${day} — ${status || 'No record'}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Salary Breakdown */}
        <div className="px-6 mt-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <CircleDollarSign size={14} className="text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Salary Breakdown</p>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 ml-auto">@ {fmtShort(rate)}</span>
            </div>

            <div className="space-y-1.5 text-xs">
              {presentDays > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <CheckCircle size={12} className="text-emerald-500" /> Present ({presentDays} days)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{fmt(earnedFromPresent)}</span>
                </div>
              )}
              {lateDays > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Clock size={12} className="text-amber-400" /> Late ({lateDays} days)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{fmt(earnedFromLate)}</span>
                </div>
              )}
              {halfDays > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <MinusCircle size={12} className="text-sky-400" /> Half Day ({halfDays} days)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{fmt(earnedFromHalf)}</span>
                </div>
              )}
              {absentDays > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <XCircle size={12} className="text-rose-500" /> Absent ({absentDays} days)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{fmt(0)}</span>
                </div>
              )}
              {leaveDays > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <MinusCircle size={12} className="text-slate-400" /> On Leave ({leaveDays} days)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{fmt(0)}</span>
                </div>
              )}
              {totalDays === 0 && (
                <p className="text-center text-slate-400 py-2">No attendance records yet</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-emerald-200/50 dark:border-emerald-800/30 my-3" />

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Total Earned</span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">{fmt(totalEarned)}</span>
            </div>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60 mt-1">
              {totalDays} days recorded · {presentDays + lateDays + halfDays} paid days
            </p>
          </div>
        </div>

        {/* Summary footer */}
        <div className="px-6 py-4 mt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" /> {presentDays}</span>
              <span className="flex items-center gap-1"><Clock size={12} className="text-amber-400" /> {lateDays}</span>
              <span className="flex items-center gap-1"><XCircle size={12} className="text-rose-500" /> {absentDays}</span>
            </div>
            <p className="text-[10px]">Total: {totalDays} days</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ───────────────────────────────────────────────── */

const ShiftStaffDisplay = ({
  patient,
  allStaff,
  onAssign,
  onUnassign,
  refreshKey = 0,
}: {
  patient: Patient;
  allStaff: Staff[];
  onAssign: () => void;
  onUnassign?: (staffId: string, staffName: string, shiftType: 'day' | 'night') => void;
  refreshKey?: number;
}) => {
  const [dayStaff, setDayStaff] = useState<AssignedStaffInfo[]>([]);
  const [nightStaff, setNightStaff] = useState<AssignedStaffInfo[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [modalData, setModalData] = useState<{ staff: Staff; rate: number } | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!supabase) return;

    const fetchAssignments = () => {
      supabase
        .from('duty_assignments')
        .select('staff_id, shift_type, status, rate_per_shift, rate_notes')
        .eq('patient_id', patient.id)
        .eq('duty_date', today)
        .in('status', ['assigned', 'confirmed', 'completed'])
        .then(({ data, error }) => {
          if (error || !data) return;
          const dayAssignments = data.filter(a => a.shift_type === 'day');
          const nightAssignments = data.filter(a => a.shift_type === 'night');
          const dayInfo: AssignedStaffInfo[] = dayAssignments.map(a => {
            const staff = allStaff.find(s => s.id === a.staff_id);
            return {
              staff: staff!,
              rate: a.rate_per_shift ?? (staff?.shift_rate || Math.round((staff?.salary || 30000) / 30)),
              notes: a.rate_notes || undefined,
            };
          }).filter(a => a.staff);
          const nightInfo: AssignedStaffInfo[] = nightAssignments.map(a => {
            const staff = allStaff.find(s => s.id === a.staff_id);
            return {
              staff: staff!,
              rate: a.rate_per_shift ?? (staff?.shift_rate || Math.round((staff?.salary || 30000) / 30)),
              notes: a.rate_notes || undefined,
            };
          }).filter(a => a.staff);
          setDayStaff(dayInfo);
          setNightStaff(nightInfo);
        });
    };

    const fetchAttendance = async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const dateFrom = startOfMonth.toISOString().split('T')[0];
      const dateTo = today;

      const staffIds = new Set<string>();
      dayStaff.forEach(s => staffIds.add(s.staff.id));
      nightStaff.forEach(s => staffIds.add(s.staff.id));

      if (staffIds.size === 0) return;

      const { data, error } = await supabase
        .from('attendance_records')
        .select('staff_id, attendance_date, status')
        .in('staff_id', Array.from(staffIds))
        .gte('attendance_date', dateFrom)
        .lte('attendance_date', dateTo);

      if (!error && data) {
        const map = new Map<string, AttendanceRecord[]>();
        for (const rec of data) {
          const arr = map.get(rec.staff_id) || [];
          arr.push({ date: rec.attendance_date, status: rec.status });
          map.set(rec.staff_id, arr);
        }
        setAttendanceMap(map);
      }
    };

    fetchAssignments();
    fetchAttendance();

    const channel = supabase.channel(`duty-patient-${patient.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'duty_assignments',
        filter: `patient_id=eq.${patient.id}`,
      }, () => { fetchAssignments(); fetchAttendance(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [patient.id, allStaff, refreshKey, today]);

  const hasAnyAssigned = dayStaff.length > 0 || nightStaff.length > 0;

  if (!hasAnyAssigned) {
    return (
      <button
        onClick={onAssign}
        className="w-full py-2.5 bg-white dark:bg-slate-900 text-sky-600 rounded-xl text-xs font-bold border border-sky-200 hover:bg-sky-100 transition-all flex items-center justify-center gap-2"
      >
        <UserPlus size={14} />
        Assign Now
      </button>
    );
  }

  const renderStaffRow = (s: AssignedStaffInfo, shiftType: 'day' | 'night') => (
    <div key={s.staff.id} className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors"
        style={{
          backgroundColor: shiftType === 'day' ? 'rgba(14,165,233,0.08)' : 'rgba(99,102,241,0.08)',
          color: shiftType === 'day' ? '#0369a1' : '#4338ca',
          borderColor: shiftType === 'day' ? 'rgba(14,165,233,0.15)' : 'rgba(99,102,241,0.15)',
        }}
      >
        {s.staff.full_name}
        {onUnassign && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnassign(s.staff.id, s.staff.full_name, shiftType); }}
            className="ml-0.5 p-0.5 hover:bg-white/50 rounded text-slate-400 hover:text-rose-500 transition-colors"
            title={`Remove ${s.staff.full_name}`}
          >
            <X size={10} />
          </button>
        )}
      </span>

      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
        {fmtShort(s.rate)}
        {s.notes && <span className="text-[8px] text-emerald-500 italic ml-0.5">— {s.notes}</span>}
      </span>

      <button
        onClick={() => setModalData({ staff: s.staff, rate: s.rate })}
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        title={`View attendance for ${s.staff.full_name}`}
      >
        <CalendarDays size={10} />
        Attendance
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Day Shift */}
      <div className="flex items-start gap-2">
        <Sun size={14} className="text-amber-500 shrink-0 mt-1" />
        <div className="flex-1 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Day</span>
          {dayStaff.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {dayStaff.map(s => renderStaffRow(s, 'day'))}
              {dayStaff.length < 2 && (
                <button onClick={onAssign} className="px-2 py-1 bg-sky-50 rounded-lg text-[10px] font-bold text-sky-500 border border-dashed border-sky-200 hover:bg-sky-100 transition-all self-start">+ Add</button>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Not assigned</span>
          )}
        </div>
      </div>

      {/* Night Shift */}
      <div className="flex items-start gap-2">
        <Moon size={14} className="text-indigo-500 shrink-0 mt-1" />
        <div className="flex-1 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Night</span>
          {nightStaff.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {nightStaff.map(s => renderStaffRow(s, 'night'))}
              {nightStaff.length < 2 && (
                <button onClick={onAssign} className="px-2 py-1 bg-indigo-50 rounded-lg text-[10px] font-bold text-indigo-500 border border-dashed border-indigo-200 hover:bg-indigo-100 transition-all self-start">+ Add</button>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Not assigned</span>
          )}
        </div>
      </div>

      {/* Attendance Modal */}
      {modalData && (
        <AttendanceModal
          staff={modalData.staff}
          rate={modalData.rate}
          records={attendanceMap.get(modalData.staff.id) || []}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  );
};

export { ShiftStaffDisplay };
