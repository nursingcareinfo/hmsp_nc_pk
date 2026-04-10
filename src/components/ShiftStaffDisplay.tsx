/**
 * Shift Staff Display Component
 * Shows assigned staff with rate per shift and an Attendance button
 * that opens the full-featured AttendanceCalendarModal (click-to-mark editing).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, UserPlus, X, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, Staff } from '../types';
import { AttendanceCalendarModal } from './AttendanceCalendarModal';

interface AssignedStaffInfo {
  staff: Staff;
  rate: number;
  notes?: string;
}

/** Compact: 1,300/shift */
function fmtShort(amount: number) {
  return `${amount.toLocaleString('en-PK')}/shift`;
}

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
  const [modalStaff, setModalStaff] = useState<Staff | null>(null);

  // O(1) staff lookup instead of O(n) .find()
  const staffMap = useMemo(() => new Map(allStaff.map(s => [s.id, s])), [allStaff]);

  useEffect(() => {
    if (!supabase) return;

    const fetchAssignments = () => {
      const today = new Date().toISOString().split('T')[0];
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

          const resolve = (assignments: typeof data): AssignedStaffInfo[] =>
            assignments
              .map(a => {
                const staff = staffMap.get(a.staff_id);
                if (!staff) return null;
                return {
                  staff,
                  rate: a.rate_per_shift ?? (staff.shift_rate || Math.round((staff.salary || 30000) / 30)),
                  notes: a.rate_notes || undefined,
                };
              })
              .filter((a): a is AssignedStaffInfo => a !== null);

          setDayStaff(resolve(dayAssignments));
          setNightStaff(resolve(nightAssignments));
        });
    };

    fetchAssignments();

    const channel = supabase.channel(`duty-patient-${patient.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'duty_assignments',
        filter: `patient_id=eq.${patient.id}`,
      }, fetchAssignments)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [patient.id, refreshKey]); // staffMap not needed — channel callback reads latest via closure

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
      <span className={
        shiftType === 'day'
          ? 'inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold border bg-sky-100/10 text-sky-700 dark:text-sky-400 border-sky-200/30 dark:border-sky-800/50'
          : 'inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold border bg-indigo-100/10 text-indigo-700 dark:text-indigo-400 border-indigo-200/30 dark:border-indigo-800/50'
      }>
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
        onClick={() => setModalStaff(s.staff)}
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        title={`Mark attendance for ${s.staff.full_name}`}
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

      {/* Attendance Calendar Modal (click-to-mark editing) */}
      {modalStaff && (
        <AttendanceCalendarModal
          isOpen={!!modalStaff}
          onClose={() => setModalStaff(null)}
          staff={modalStaff}
        />
      )}
    </div>
  );
};

export { ShiftStaffDisplay };
