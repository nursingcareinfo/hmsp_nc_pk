/**
 * HR Management Module
 * - Compensation tab: staff salary management with range validation
 * - Attendance tab: full-page attendance calendar with bulk operations
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Calendar,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Users,
  TrendingUp,
} from 'lucide-react';
import { dataService } from '../dataService';
import { attendanceService, AttendanceStatus } from '../services/attendanceService';
import { Staff } from '../types';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Salary Standards by Designation ---
interface SalaryStandard {
  min: number;
  max: number;
  unit: string;
  label: string;
}

const SALARY_STANDARDS: Record<string, SalaryStandard> = {
  Nurse: { min: 2500, max: 3500, unit: 'shift', label: 'Rs. 2,500-3,500/shift' },
  'Nurse Assistant': { min: 1800, max: 2500, unit: 'shift', label: 'Rs. 1,800-2,500/shift' },
  Attendant: { min: 1200, max: 1500, unit: 'shift', label: 'Rs. 1,200-1,500/shift' },
  'Mid Wife': { min: 1500, max: 2000, unit: 'shift', label: 'Rs. 1,500-2,000/shift' },
  Midwife: { min: 1500, max: 2000, unit: 'shift', label: 'Rs. 1,500-2,000/shift' },
  Technician: { min: 1500, max: 2000, unit: 'shift', label: 'Rs. 1,500-2,000/shift' },
  Doctor: { min: 5000, max: 5000, unit: 'visit', label: 'Rs. 5,000/visit' },
  // Fallback for unmatched designations
  default: { min: 1000, max: 10000, unit: 'shift', label: 'Rs. 1,000-10,000/shift' },
};

function getSalaryStandard(designation: string): SalaryStandard {
  return SALARY_STANDARDS[designation] || SALARY_STANDARDS['default'];
}

function getRateStatus(rate: number, standard: SalaryStandard): 'ok' | 'below' | 'above' {
  if (rate < standard.min) return 'below';
  if (rate > standard.max) return 'above';
  return 'ok';
}

// --- Tab Type ---
type HRTab = 'compensation' | 'attendance';

// ==================== COMPENSATION TAB ====================

const CompensationTab = ({ staff }: { staff: Staff[] }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [designationFilter, setDesignationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'outlier'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRate, setBulkRate] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const designations = useMemo(() => {
    const d = new Set(staff.map(s => s.designation));
    return ['All', ...Array.from(d).sort()];
  }, [staff]);

  const filtered = useMemo(() => {
    return staff.filter(s => {
      if (search && !s.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (designationFilter !== 'All' && s.designation !== designationFilter) return false;
      if (statusFilter === 'outlier') {
        const standard = getSalaryStandard(s.designation);
        const rate = s.shift_rate || Math.round((s.salary || 30000) / 30);
        if (getRateStatus(rate, standard) === 'ok') return false;
      }
      return true;
    });
  }, [staff, search, designationFilter, statusFilter]);

  const outliers = useMemo(() => {
    return filtered.filter(s => {
      const standard = getSalaryStandard(s.designation);
      const rate = s.shift_rate || Math.round((s.salary || 30000) / 30);
      return getRateStatus(rate, standard) !== 'ok';
    });
  }, [filtered]);

  const handleEdit = (s: Staff) => {
    setEditingId(s.id);
    setEditRate(s.shift_rate || Math.round((s.salary || 30000) / 30));
  };

  const handleSave = async (s: Staff) => {
    setSavingIds(prev => new Set(prev).add(s.id));
    try {
      await dataService.updateStaff(s.id, { shift_rate: editRate });
      await queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(`${s.full_name} updated to Rs. ${editRate.toLocaleString()}/shift`);
      setEditingId(null);
    } catch {
      toast.error('Failed to update salary');
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(s.id);
        return next;
      });
    }
  };

  const handleBulkSave = async () => {
    const rate = parseInt(bulkRate);
    if (!rate || rate <= 0) {
      toast.error('Enter a valid rate');
      return;
    }
    setSavingIds(selectedIds);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => dataService.updateStaff(id, { shift_rate: rate }))
      );
      await queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(`Updated ${selectedIds.size} staff to Rs. ${rate.toLocaleString()}/shift`);
      setSelectedIds(new Set());
      setBulkRate('');
      setIsBulkMode(false);
    } catch {
      toast.error('Failed to update some staff');
    } finally {
      setSavingIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Staff</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{staff.length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase">In Range</p>
          <p className="text-2xl font-black text-emerald-600">{staff.length - outliers.length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Outliers</p>
          <p className="text-2xl font-black text-amber-600">{outliers.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
          />
        </div>
        <select
          value={designationFilter}
          onChange={e => setDesignationFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
        >
          {designations.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button
          onClick={() => setStatusFilter(f => f === 'all' ? 'outlier' : 'all')}
          className={cn(
            "px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2",
            statusFilter === 'outlier'
              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
          )}
        >
          <AlertTriangle size={14} />
          Outliers ({outliers.length})
        </button>
        <button
          onClick={() => { setIsBulkMode(!isBulkMode); setSelectedIds(new Set()); }}
          className={cn(
            "px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2",
            isBulkMode
              ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700"
              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
          )}
        >
          <Users size={14} />
          Bulk Edit
        </button>
      </div>

      {/* Bulk Edit Bar */}
      {isBulkMode && (
        <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-200 dark:border-teal-800 flex items-center gap-3">
          <span className="text-sm font-bold text-teal-700 dark:text-teal-400">
            {selectedIds.size} selected
          </span>
          <input
            type="number"
            placeholder="New rate (per shift)"
            value={bulkRate}
            onChange={e => setBulkRate(e.target.value)}
            className="w-40 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
          />
          <button
            onClick={handleBulkSave}
            disabled={!bulkRate || selectedIds.size === 0}
            className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold disabled:opacity-50"
          >
            Apply to All
          </button>
          <button
            onClick={toggleSelectAll}
            className="px-3 py-2 text-sm text-teal-600 font-bold"
          >
            {selectedIds.size === filtered.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              {isBulkMode && <th className="p-4 w-12"><input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} /></th>}
              <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
              <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation</th>
              <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Rate</th>
              <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Standard</th>
              <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Est.</th>
              <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Reliability</th>
              <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const standard = getSalaryStandard(s.designation);
              const rate = s.shift_rate || Math.round((s.salary || 30000) / 30);
              const status = getRateStatus(rate, standard);
              const isEditing = editingId === s.id;
              const isSaving = savingIds.has(s.id);

              return (
                <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  {isBulkMode && <td className="p-4"><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} /></td>}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                        {s.full_name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs text-slate-600 dark:text-slate-400">{s.designation}</td>
                  <td className="p-4">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editRate}
                        onChange={e => setEditRate(Number(e.target.value))}
                        className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-teal-300 rounded-lg text-sm font-bold"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Rs. {rate.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-slate-500">{standard.label}</td>
                  <td className="p-4 text-xs text-slate-500">Rs. {(rate * 30).toLocaleString()}</td>
                  <td className="p-4">
                    {(() => {
                      const score = s.reliability_score;
                      if (!score || score === 0) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                            ⚪ N/A
                          </span>
                        );
                      }
                      if (score >= 80) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                            🟢 {score}%
                          </span>
                        );
                      }
                      if (score >= 60) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                            🟡 {score}%
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-full">
                          🔴 {score}%
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-4">
                    {status === 'ok' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                        <CheckCircle2 size={10} /> OK
                      </span>
                    ) : status === 'below' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                        <AlertTriangle size={10} /> Below
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-full">
                        <XCircle size={10} /> Above
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(s)}
                          disabled={isSaving}
                          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                        >
                          {isSaving ? '...' : <Save size={10} />} Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-lg text-[10px] font-bold flex items-center gap-1"
                        >
                          <RotateCcw size={10} /> Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(s)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            No staff found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== ATTENDANCE TAB ====================

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_CONFIG: Record<AttendanceStatus, { color: string; bg: string; label: string }> = {
  present: { color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Present' },
  absent: { color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30', label: 'Absent' },
  late: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Late' },
  half_day: { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Half Day' },
  on_leave: { color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30', label: 'On Leave' },
};

const AttendanceTab = ({ staff }: { staff: Staff[] }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Record<string, AttendanceStatus>>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState<Set<string>>(new Set());

  const filteredStaff = useMemo(() => {
    if (!search) return staff;
    return staff.filter(s => s.full_name.toLowerCase().includes(search.toLowerCase()));
  }, [staff, search]);

  // Load attendance for selected staff
  React.useEffect(() => {
    if (!selectedStaffId) return;
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
    setLoadingStaff(new Set([selectedStaffId]));
    attendanceService.getStaffAttendance(selectedStaffId, start, end).then(records => {
      const map: Record<string, AttendanceStatus> = {};
      records.forEach(r => { map[r.attendance_date] = r.status; });
      setAttendanceMap(prev => ({ ...prev, [selectedStaffId]: map }));
      setLoadingStaff(new Set());
    });
  }, [selectedStaffId, year, month]);

  const handleMarkAttendance = async (date: string, status: AttendanceStatus) => {
    if (!selectedStaffId) {
      toast.error('Select a staff member first');
      return;
    }
    try {
      await attendanceService.markAttendance(selectedStaffId, date, status, {
        shiftType: 'day',
      });
      setAttendanceMap(prev => ({
        ...prev,
        [selectedStaffId]: { ...prev[selectedStaffId], [date]: status },
      }));
      toast.success(`Marked ${STATUS_CONFIG[status].label} for ${date}`);
      setStatusPickerOpen(false);
    } catch {
      toast.error('Failed to mark attendance');
    }
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const selectedStaff = staff.find(s => s.id === selectedStaffId);
  const monthAttendance = attendanceMap[selectedStaffId] || {};

  // Monthly summary
  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(monthAttendance).forEach(s => { counts[s] = (counts[s] || 0) + 1; });
    return counts;
  }, [monthAttendance]);

  const rate = selectedStaff ? (selectedStaff.shift_rate || Math.round((selectedStaff.salary || 30000) / 30)) : 0;
  const presentCredits = (summary.present || 0) + (summary.half_day || 0) * 0.5 + (summary.late || 0) * 0.75;
  const estimatedSalary = Math.round(presentCredits * rate);

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* Left Panel: Staff List */}
      <div className="w-64 shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Staff</p>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredStaff.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStaffId(s.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                selectedStaffId === s.id
                  ? "bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {s.full_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.full_name}</p>
                <p className="text-[10px] text-slate-500">{s.designation}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel: Calendar */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Month Navigation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between">
          <button onClick={() => setMonth(m => m === 0 ? 11 : m - 1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {MONTHS[month]} {year}
          </h3>
          <button onClick={() => setMonth(m => m === 11 ? 0 : m + 1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
            <ChevronRight size={20} />
          </button>
        </div>

        {selectedStaff ? (
          <>
            {/* Calendar Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>
                ))}
                {calendarCells.map((day, i) => {
                  if (day === null) return <div key={`e-${i}`} />;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const status = monthAttendance[dateStr];
                  const config = status ? STATUS_CONFIG[status] : null;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => { setSelectedDate(dateStr); setStatusPickerOpen(true); }}
                      className={cn(
                        "aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all",
                        config ? cn(config.bg, config.color, "font-bold") : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400",
                        selectedDate === dateStr && "ring-2 ring-teal-500"
                      )}
                    >
                      <span>{day}</span>
                      {config && <span className="text-[8px] uppercase">{config.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-5 gap-3">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <div key={key} className={cn("p-3 rounded-xl", cfg.bg)}>
                  <p className={cn("text-[10px] font-bold uppercase", cfg.color)}>{cfg.label}</p>
                  <p className={cn("text-lg font-black", cfg.color)}>{summary[key] || 0}</p>
                </div>
              ))}
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase">Est. Salary</p>
                <p className="text-lg font-black text-teal-600 dark:text-teal-400">Rs. {estimatedSalary.toLocaleString()}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="text-center">
              <Users size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Select a staff member to view attendance</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Picker Modal */}
      {statusPickerOpen && selectedDate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setStatusPickerOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-80">
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">Mark Attendance</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedStaff?.full_name} • {selectedDate}</p>
            <div className="grid grid-cols-1 gap-2">
              {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleMarkAttendance(selectedDate, key)}
                  className={cn("flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]", cfg.bg, cfg.color)}
                >
                  <span className="text-sm font-bold">{cfg.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStatusPickerOpen(false)}
              className="mt-4 w-full py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 rounded-xl text-sm font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== MAIN MODULE ====================

export const HRManagementModule: React.FC = () => {
  const [tab, setTab] = useState<HRTab>('compensation');

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: dataService.getStaff,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">HR Management</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage staff compensation and track attendance
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('compensation')}
          className={cn(
            "px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
            tab === 'compensation'
              ? "bg-teal-600 text-white shadow-lg shadow-teal-200 dark:shadow-teal-900/30"
              : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-700"
          )}
        >
          <DollarSign size={16} />
          Compensation
        </button>
        <button
          onClick={() => setTab('attendance')}
          className={cn(
            "px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
            tab === 'attendance'
              ? "bg-teal-600 text-white shadow-lg shadow-teal-200 dark:shadow-teal-900/30"
              : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-700"
          )}
        >
          <Calendar size={16} />
          Attendance
        </button>
      </div>

      {/* Content */}
      {tab === 'compensation' ? (
        <CompensationTab staff={staff} />
      ) : (
        <AttendanceTab staff={staff} />
      )}
    </div>
  );
};
