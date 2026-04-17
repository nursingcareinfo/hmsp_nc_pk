/**
 * Shift Staff Display Component
 * Shows assigned staff with rate per shift, Attendance button, and ADMIN rate controls.
 *
 * Rate editing:
 * - ADMIN-only: +/- buttons adjust duty_assignments.rate_per_shift
 * - Optimistic UI update with toast notification + 5s undo
 * - Guardrails: min/max based on designation salary standards
 * - Color-coded badges: green=standard, amber=below, rose=above
 * - Changes affect only this patient-staff pairing (not global staff rate)
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sun, Moon, UserPlus, X, CalendarDays, Minus, Plus, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, Staff } from '../types';
import { dutyService } from '../services/dutyService';
import { AttendanceCalendarModal } from './AttendanceCalendarModal';
import { useAuth } from '../hooks/useAuth';
import { getSalaryStandard, getRateStatus, RATE_STEPS, RATE_HARD_MIN, RATE_HARD_MAX } from '../constants/salaryStandards';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface AssignedStaffInfo {
  assignmentId: string;
  staff: Staff;
  rate: number;
  notes?: string;
}

/* ─── Rate Status Badge ───────────────────────────────────────────── */

function RateBadge({
  rate,
  designation,
  hasOverride,
}: {
  rate: number;
  designation: string;
  hasOverride: boolean;
}) {
  const standard = getSalaryStandard(designation);
  const status = getRateStatus(rate, standard);

  const colorMap = {
    ok: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50',
    below: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50',
    above: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200/50 dark:border-rose-800/50',
  };

  const labelMap = {
    ok: hasOverride ? 'custom' : 'standard',
    below: 'below standard',
    above: 'above standard',
  };

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border ${colorMap[status]}`}>
      {rate.toLocaleString('en-PK')}/shift
      {status !== 'ok' && <span className="text-[8px] italic ml-0.5">— {labelMap[status]}</span>}
    </span>
  );
}

/* ─── Rate Adjust Controls (ADMIN only) ────────────────────────────── */

interface RateControlsProps {
  staff: Staff;
  currentRate: number;
  assignmentId: string;
  onRateChanged: (newRate: number, assignmentId: string) => void;
}

function RateControls({ staff, currentRate, assignmentId, onRateChanged }: RateControlsProps) {
  const { isAdmin } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isAdmin) return null;

  const standard = getSalaryStandard(staff.designation);

  const handleAdjust = async (step: number) => {
    const newRate = Math.round(currentRate + step);

    // Hard guardrails
    if (newRate < RATE_HARD_MIN) {
      toast.error(`Rate cannot go below Rs. ${RATE_HARD_MIN.toLocaleString('en-PK')}`);
      return;
    }
    if (newRate > RATE_HARD_MAX) {
      toast.error(`Rate cannot exceed Rs. ${RATE_HARD_MAX.toLocaleString('en-PK')}`);
      return;
    }

    // Soft warning for out-of-standard rates
    if (newRate < standard.min || newRate > standard.max) {
      const direction = newRate < standard.min ? 'below' : 'above';
      toast.warning(
        `Rs. ${newRate.toLocaleString('en-PK')} is ${direction} standard for ${staff.designation} (Rs. ${standard.min.toLocaleString('en-PK')}–${standard.max.toLocaleString('en-PK')})`,
        { duration: 4000 }
      );
    }

    setIsUpdating(true);

    try {
      await dutyService.updateShiftRate(assignmentId, newRate);
      onRateChanged(newRate, assignmentId);

      toast.success(
        `Rate updated: Rs. ${currentRate.toLocaleString('en-PK')} → Rs. ${newRate.toLocaleString('en-PK')}`,
        {
          action: {
            label: 'Undo',
            onClick: async () => {
              await dutyService.updateShiftRate(assignmentId, currentRate);
              onRateChanged(currentRate, assignmentId);
              toast.info(`Rate reverted to Rs. ${currentRate.toLocaleString('en-PK')}`);
            },
          },
          duration: 5000,
        }
      );
    } catch (err) {
      console.error('Rate update failed:', err);
      toast.error('Failed to update rate. Check connection.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-0.5 ml-1">
      {RATE_STEPS.map((step) => (
        <button
          key={`minus-${step}`}
          onClick={() => handleAdjust(-step)}
          disabled={isUpdating || currentRate - step < RATE_HARD_MIN}
          className="p-0.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={`Decrease by Rs. ${step.toLocaleString('en-PK')}`}
        >
          <Minus size={10} />
        </button>
      ))}
      <span className="text-[8px] text-slate-300 dark:text-slate-600 mx-0.5">|</span>
      {RATE_STEPS.map((step) => (
        <button
          key={`plus-${step}`}
          onClick={() => handleAdjust(step)}
          disabled={isUpdating || currentRate + step > RATE_HARD_MAX}
          className="p-0.5 rounded text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={`Increase by Rs. ${step.toLocaleString('en-PK')}`}
        >
          <Plus size={10} />
        </button>
      ))}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────── */

const ShiftStaffDisplay = ({
  patient,
  allStaff,
  onAssign,
  onUnassign,
  onViewStaff,
  refreshKey = 0,
}: {
  patient: Patient;
  allStaff: Staff[];
  onAssign: () => void;
  onUnassign?: (staffId: string, staffName: string, shiftType: 'day' | 'night') => void;
  onViewStaff?: (staff: Staff) => void;
  refreshKey?: number;
}) => {
  const [dayStaff, setDayStaff] = useState<AssignedStaffInfo[]>([]);
  const [nightStaff, setNightStaff] = useState<AssignedStaffInfo[]>([]);
  const [modalStaff, setModalStaff] = useState<Staff | null>(null);

  // O(1) staff lookup instead of O(n) .find()
  const staffMap = useMemo(() => new Map(allStaff.map(s => [s.id, s])), [allStaff]);

  // Track original rates for undo (keyed by assignmentId)
  const originalRatesRef = useRef<Map<string, number>>(new Map());

  const handleRateChanged = (newRate: number, assignmentId: string) => {
    // Save original rate for undo if not already saved
    if (!originalRatesRef.current.has(assignmentId)) {
      originalRatesRef.current.set(assignmentId, newRate);
    }

    // Update local state optimistically
    const updateRate = (list: AssignedStaffInfo[]) =>
      list.map(s => s.assignmentId === assignmentId ? { ...s, rate: newRate } : s);

    setDayStaff(prev => updateRate(prev));
    setNightStaff(prev => updateRate(prev));
  };

  useEffect(() => {
    if (!supabase) return;

    const fetchAssignments = () => {
      const today = new Date().toISOString().split('T')[0];
      supabase
        .from('duty_assignments')
        .select('id, staff_id, shift_type, status, rate_per_shift, rate_notes')
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
                const resolved: AssignedStaffInfo = {
                  assignmentId: a.id,
                  staff,
                  rate: a.rate_per_shift ?? (staff.shift_rate || Math.round((staff.salary || 30000) / 30)),
                  notes: a.rate_notes || undefined,
                };
                return resolved;
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
  }, [patient.id, refreshKey]);

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

  const renderStaffCard = (s: AssignedStaffInfo, shiftType: 'day' | 'night') => {
    const baseRate = s.staff.shift_rate || Math.round((s.staff.salary || 30000) / 30);
    const hasOverride = !!s.notes || s.rate !== baseRate;
    const borderClass = shiftType === 'day' ? 'border-l-amber-400' : 'border-l-indigo-400';
    const bgClass = shiftType === 'day' ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'bg-indigo-50/50 dark:bg-indigo-900/10';
    const initialColor = shiftType === 'day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700';

    return (
      <div key={s.staff.id} className={cn("flex items-start gap-3 p-3 rounded-xl border border-l-4 bg-white dark:bg-slate-900/50 shadow-sm border-slate-100 dark:border-slate-800", borderClass)}>
        {/* Avatar */}
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0", initialColor)}>
          {(s.staff.full_name || '?').charAt(0)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-xs font-bold cursor-pointer transition-colors hover:underline",
                onViewStaff ? "text-sky-600 dark:text-sky-400" : "text-slate-900 dark:text-white"
              )}
              onClick={onViewStaff ? () => onViewStaff(s.staff) : undefined}
              title={onViewStaff ? `View ${s.staff.full_name}'s profile` : undefined}
            >
              {s.staff.full_name}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              {s.staff.designation || '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <RateBadge rate={s.rate} designation={s.staff.designation} hasOverride={hasOverride} />
            <RateControls
              staff={s.staff}
              currentRate={s.rate}
              assignmentId={s.assignmentId}
              onRateChanged={handleRateChanged}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setModalStaff(s.staff)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={`Mark attendance for ${s.staff.full_name}`}
          >
            <CalendarDays size={12} />
            Attendance
          </button>
          {onUnassign && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnassign(s.staff.id, s.staff.full_name, shiftType); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
              title={`Remove ${s.staff.full_name}`}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderShiftSection = (
    shiftType: 'day' | 'night',
    staffList: AssignedStaffInfo[],
    icon: React.ReactNode,
    label: string,
    addBtnColor: string
  ) => (
    <div className={cn("rounded-2xl border overflow-hidden", shiftType === 'day' ? 'border-amber-200/50 dark:border-amber-800/30' : 'border-indigo-200/50 dark:border-indigo-800/30')}>
      {/* Shift header */}
      <div className={cn("px-3 py-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider", shiftType === 'day' ? 'bg-amber-50/80 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'bg-indigo-50/80 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400')}>
        {icon}
        {label}
        <span className="ml-auto text-[10px] font-bold opacity-60">{staffList.length}/2</span>
      </div>

      <div className="p-2 space-y-2">
        {staffList.length > 0 ? (
          staffList.map(s => renderStaffCard(s, shiftType))
        ) : (
          <span className="text-[10px] text-slate-400 italic px-1">Not assigned</span>
        )}
        {staffList.length < 2 && (
          <button onClick={onAssign} className={cn("w-full py-2 rounded-xl text-[10px] font-bold border border-dashed transition-all", addBtnColor)}>
            + Add Staff
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {renderShiftSection('day', dayStaff, <Sun size={13} />, 'Day Shift', 'bg-sky-50 text-sky-500 border-sky-200 hover:bg-sky-100')}
      {renderShiftSection('night', nightStaff, <Moon size={13} />, 'Night Shift', 'bg-indigo-50 text-indigo-500 border-indigo-200 hover:bg-indigo-100')}

      {/* Attendance Calendar Modal */}
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
