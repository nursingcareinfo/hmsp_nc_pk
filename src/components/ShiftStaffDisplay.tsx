/**
 * Shift Staff Display Component
 * Shows assigned staff with rate per shift and monthly attendance calendar.
 */
import React, { useState } from 'react';
import { Sun, Moon, UserPlus, X, IndianRupee, CheckCircle, Clock, XCircle } from 'lucide-react';
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
  const [attendanceMap, setAttendanceMap] = useState<Map<string, { date: string; status: string }[]>>(new Map());

  React.useEffect(() => {
    if (!supabase) return;
    const today = new Date().toISOString().split('T')[0];

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

    fetchAssignments();

    // Fetch attendance for this month
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
        const map = new Map<string, { date: string; status: string }[]>();
        for (const rec of data) {
          const arr = map.get(rec.staff_id) || [];
          arr.push({ date: rec.attendance_date, status: rec.status });
          map.set(rec.staff_id, arr);
        }
        setAttendanceMap(map);
      }
    };

    fetchAttendance();

    const channel = supabase.channel(`duty-patient-${patient.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'duty_assignments',
        filter: `patient_id=eq.${patient.id}`,
      }, fetchAssignments)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [patient.id, allStaff, refreshKey]);

  const hasAnyAssigned = dayStaff.length > 0 || nightStaff.length > 0;

  const renderAttendanceCalendar = (staffId: string) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const records = attendanceMap.get(staffId) || [];
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

    return (
      <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Attendance — {format(today, 'MMMM yyyy')}</p>
          <div className="flex gap-2 text-[9px] text-slate-400">
            <span className="flex items-center gap-0.5"><CheckCircle size={8} className="text-emerald-500" /> P</span>
            <span className="flex items-center gap-0.5"><Clock size={8} className="text-amber-400" /> L</span>
            <span className="flex items-center gap-0.5"><XCircle size={8} className="text-rose-500" /> A</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[8px] font-bold text-slate-400 py-0.5">{d}</div>
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
                  "text-center text-[9px] font-medium py-0.5 rounded-sm",
                  status ? statusColor(status) : 'text-slate-400 dark:text-slate-500',
                  isToday && !status && 'ring-1 ring-teal-500'
                )}
                title={`${day} ${status || '—'}`}
              >
                {day}
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-2 text-[9px] text-slate-500">
          <span>✅ {records.filter(r => r.status === 'present').length}</span>
          <span>⏰ {records.filter(r => r.status === 'late').length}</span>
          <span>❌ {records.filter(r => r.status === 'absent').length}</span>
        </div>
      </div>
    );
  };

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

  return (
    <div className="space-y-4">
      {/* Day Shift */}
      <div className="flex items-start gap-2">
        <Sun size={14} className="text-amber-500 shrink-0 mt-1" />
        <div className="flex-1 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Day</span>
          {dayStaff.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {dayStaff.map(s => (
                <div key={s.staff.id}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-0.5 px-2 py-1 bg-sky-100/60 rounded-lg text-[10px] font-bold text-sky-700 border border-sky-200/50">
                      {s.staff.full_name}
                      {onUnassign && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUnassign(s.staff.id, s.staff.full_name, 'day'); }}
                          className="ml-0.5 p-0.5 hover:bg-sky-200 rounded text-slate-400 hover:text-rose-500 transition-colors"
                          title={`Remove ${s.staff.full_name} from Day shift`}
                        >
                          <X size={10} />
                        </button>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded text-[9px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                      <IndianRupee size={8} />
                      {s.rate.toLocaleString()}/shift
                      {s.notes && (
                        <span className="text-[8px] text-emerald-500 italic ml-0.5">— {s.notes}</span>
                      )}
                    </span>
                  </div>
                  {renderAttendanceCalendar(s.staff.id)}
                </div>
              ))}
              {dayStaff.length < 2 && (
                <button
                  onClick={onAssign}
                  className="px-2 py-1 bg-sky-50 rounded-lg text-[10px] font-bold text-sky-500 border border-dashed border-sky-200 hover:bg-sky-100 transition-all self-start"
                >
                  + Add
                </button>
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
        <div className="flex-1 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Night</span>
          {nightStaff.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {nightStaff.map(s => (
                <div key={s.staff.id}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-0.5 px-2 py-1 bg-indigo-100/60 rounded-lg text-[10px] font-bold text-indigo-700 border border-indigo-200/50">
                      {s.staff.full_name}
                      {onUnassign && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUnassign(s.staff.id, s.staff.full_name, 'night'); }}
                          className="ml-0.5 p-0.5 hover:bg-indigo-200 rounded text-slate-400 hover:text-rose-500 transition-colors"
                          title={`Remove ${s.staff.full_name} from Night shift`}
                        >
                          <X size={10} />
                        </button>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded text-[9px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                      <IndianRupee size={8} />
                      {s.rate.toLocaleString()}/shift
                      {s.notes && (
                        <span className="text-[8px] text-emerald-500 italic ml-0.5">— {s.notes}</span>
                      )}
                    </span>
                  </div>
                  {renderAttendanceCalendar(s.staff.id)}
                </div>
              ))}
              {nightStaff.length < 2 && (
                <button
                  onClick={onAssign}
                  className="px-2 py-1 bg-indigo-50 rounded-lg text-[10px] font-bold text-indigo-500 border border-dashed border-indigo-200 hover:bg-indigo-100 transition-all self-start"
                >
                  + Add
                </button>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Not assigned</span>
          )}
        </div>
      </div>
    </div>
  );
};

export { ShiftStaffDisplay };
