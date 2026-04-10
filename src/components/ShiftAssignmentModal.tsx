import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Check, X, AlertCircle, UserPlus, Clock, MapPin, UserCheck, Search, Filter, Users, Sparkles, IndianRupee, FileText } from 'lucide-react';
import { Staff, Patient } from '../types';
import { dutyService } from '../services/dutyService';
import { matchStaffToPatient, MatchResult } from '../services/matchingService';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ShiftType = 'day' | 'night';

interface ShiftAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  allStaff: Staff[];
  onAssigned: () => void;
}

export const ShiftAssignmentModal: React.FC<ShiftAssignmentModalProps> = ({
  isOpen,
  onClose,
  patient,
  allStaff,
  onAssigned,
}) => {
  const [selectedShifts, setSelectedShifts] = useState<ShiftType[]>(['day', 'night']);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedStaff, setAssignedStaff] = useState<{ day: Staff[]; night: Staff[] }>({ day: [], night: [] });

  // Rate override state (hybrid salary model)
  const [rateOverride, setRateOverride] = useState<number>(0);
  const [rateNotes, setRateNotes] = useState('');

  // Search + Filter state
  const [rawSearchQuery, setRawSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterDistrict, setFilterDistrict] = useState<string>('All');
  const [showAllStaff, setShowAllStaff] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showCount, setShowCount] = useState(50);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input (250ms) + require min 2 chars
  const handleSearchChange = useCallback((value: string) => {
    setRawSearchQuery(value);
    setFocusedIndex(-1);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value.length >= 2 ? value : '');
    }, 250);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, []);

  // Toggle shift selection
  const toggleShift = (shift: ShiftType) => {
    setSelectedShifts(prev =>
      prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]
    );
  };

  // Load assigned staff and calculate matches
  useEffect(() => {
    if (!isOpen || allStaff.length === 0) return;

    setIsCalculating(true);

    Promise.all([
      // Get currently assigned staff
      dutyService.getTodayPatientShiftAssignments(patient.id, allStaff),
      // Calculate matching staff
      Promise.resolve(
        matchStaffToPatient(patient, allStaff, { minScore: 20, limit: 20 })
      ),
    ]).then(([assigned, results]) => {
      setAssignedStaff(assigned);
      setMatches(results);
      setIsCalculating(false);
    });
  }, [isOpen, patient.id, allStaff]);

  // Filter out already assigned staff and staff with conflicting shifts
  const filterMatches = async () => {
    const filtered: MatchResult[] = [];

    for (const match of matches) {
      // Skip if already assigned to any shift for this patient
      const isDayAssigned = assignedStaff.day.some(s => s.id === match.staff.id);
      const isNightAssigned = assignedStaff.night.some(s => s.id === match.staff.id);
      if (isDayAssigned || isNightAssigned) continue;

      // Check for cross-patient double-booking
      const staffToday = await dutyService.getStaffTodayAssignments(match.staff.id);

      // Check if staff is available for all selected shifts
      const hasConflict = selectedShifts.some(shift => staffToday[shift]);
      if (hasConflict) continue;

      filtered.push(match);
    }

    return filtered;
  };

  const [availableMatches, setAvailableMatches] = useState<MatchResult[]>([]);

  useEffect(() => {
    if (matches.length > 0) {
      filterMatches().then(setAvailableMatches);
    }
  }, [matches, selectedShifts, assignedStaff]);

  // Build the full staff pool for "Show All" mode
  const fullStaffPool = useMemo(() => {
    // Create MatchResult wrappers for all staff (with 0 score since they weren't matched)
    const assignedIds = new Set([
      ...assignedStaff.day.map(s => s.id),
      ...assignedStaff.night.map(s => s.id),
    ]);

    return allStaff
      .filter(s => s.status === 'Active' && !assignedIds.has(s.id))
      .map(staff => ({
        staff,
        score: 0,
        percentage: 0,
        breakdown: {},
        reasons: ['Available staff'],
      }));
  }, [allStaff, assignedStaff]);

  // Apply search + filters to the active pool
  const filteredStaff = useMemo(() => {
    const pool = showAllStaff ? fullStaffPool : availableMatches;

    return pool.filter(match => {
      const s = match.staff;
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = s.full_name.toLowerCase().includes(q);
        const districtMatch = (s.official_district || '').toLowerCase().includes(q);
        const designationMatch = (s.designation || '').toLowerCase().includes(q);
        if (!nameMatch && !districtMatch && !designationMatch) return false;
      }
      // Category filter
      if (filterCategory !== 'All' && s.category !== filterCategory) return false;
      // District filter
      if (filterDistrict !== 'All' && s.official_district !== filterDistrict) return false;
      return true;
    });
  }, [showAllStaff, availableMatches, fullStaffPool, searchQuery, filterCategory, filterDistrict]);

  // Paginate: show only first N results for performance
  const visibleStaff = filteredStaff.slice(0, showCount);
  const hasMore = showCount < filteredStaff.length;

  // Unique categories and districts for filter chips
  const categories = useMemo(() => {
    const pool = showAllStaff ? fullStaffPool : availableMatches;
    const cats = new Set(pool.map(m => m.staff.category).filter(Boolean));
    return ['All', ...Array.from(cats).sort()];
  }, [showAllStaff, availableMatches, fullStaffPool]);

  const districts = useMemo(() => {
    const pool = showAllStaff ? fullStaffPool : availableMatches;
    const dists = new Set(pool.map(m => m.staff.official_district).filter(Boolean));
    return ['All', ...Array.from(dists).sort()];
  }, [showAllStaff, availableMatches, fullStaffPool]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => Math.min(prev + 1, filteredStaff.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      const match = filteredStaff[focusedIndex];
      if (match) setSelectedStaffId(match.staff.id);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filteredStaff, focusedIndex, onClose]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedEl = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedEl) {
        focusedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex]);

  // Reset search/filters when toggling showAllStaff
  useEffect(() => {
    setSearchQuery('');
    setRawSearchQuery('');
    setFilterCategory('All');
    setFilterDistrict('All');
    setFocusedIndex(-1);
    setShowCount(50);
  }, [showAllStaff]);

  // Reset pagination when search/filter changes
  useEffect(() => {
    setShowCount(50);
  }, [searchQuery, filterCategory, filterDistrict]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-fill rate when staff is selected
  useEffect(() => {
    if (selectedStaffId) {
      const staff = allStaff.find(s => s.id === selectedStaffId);
      if (staff) {
        setRateOverride(staff.shift_rate || Math.round(staff.salary / 30));
      }
    } else {
      setRateOverride(0);
    }
    setRateNotes('');
  }, [selectedStaffId, allStaff]);

  // Highlight matching text helper
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const handleAssign = async () => {
    if (!selectedStaffId || selectedShifts.length === 0) {
      toast.error('Please select staff and at least one shift');
      return;
    }

    const staff = allStaff.find(s => s.id === selectedStaffId);
    if (!staff) return;

    setIsSubmitting(true);

    try {
      const effectiveRate = rateOverride > 0 ? rateOverride : undefined;
      const effectiveNotes = rateNotes.trim() || undefined;
      await dutyService.assignStaffToShifts(patient, staff, selectedShifts, undefined, effectiveRate, effectiveNotes);
      const rateStr = effectiveRate ? ` @ Rs.${effectiveRate.toLocaleString()}/shift` : '';
      toast.success(
        `Assigned ${staff.full_name} to ${selectedShifts.map(s => s === 'day' ? 'Day' : 'Night').join(' & ')} shift${selectedShifts.length > 1 ? 's' : ''}${rateStr}`
      );
      onAssigned();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign staff';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async (staffId: string, shiftType: ShiftType) => {
    const staff = allStaff.find(s => s.id === staffId);
    if (!staff) return;

    try {
      await dutyService.unassignStaffFromShift(patient.id, staffId, shiftType);
      toast.success(`Removed ${staff.full_name} from ${shiftType} shift`);
      // Refresh assigned staff
      const updated = await dutyService.getTodayPatientShiftAssignments(patient.id, allStaff);
      setAssignedStaff(updated);
      onAssigned();
    } catch (error) {
      toast.error('Failed to unassign staff');
    }
  };

  if (!isOpen) return null;

  const selectedStaff = allStaff.find(s => s.id === selectedStaffId);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
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
        className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-teal-600 to-sky-600 text-white">
          <div>
            <h2 className="text-xl font-black tracking-tight">Assign Staff</h2>
            <p className="text-teal-100 text-sm font-medium">
              {patient.full_name} • Select shifts and staff
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {isCalculating ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-10 h-10 border-4 border-teal-100 dark:border-teal-900/30 border-t-teal-600 rounded-full animate-spin" />
              <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
                Loading assignments...
              </p>
            </div>
          ) : (
            <>
              {/* Currently Assigned Staff */}
              {(assignedStaff.day.length > 0 || assignedStaff.night.length > 0) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Currently Assigned Today
                  </h3>

                  {assignedStaff.day.length > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-2xl border border-sky-100 dark:border-sky-800">
                      <Sun size={18} className="text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase w-16">Day</span>
                      <span className="text-xs text-sky-400">(7AM-7PM)</span>
                      <div className="flex-1 flex flex-wrap gap-2">
                        {assignedStaff.day.map(staff => (
                          <div key={staff.id} className="flex items-center gap-2 px-3 py-1.5 bg-sky-100/70 dark:bg-slate-800 rounded-full text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">{staff.full_name}</span>
                            <button
                              onClick={() => handleUnassign(staff.id, 'day')}
                              className="text-slate-400 hover:text-rose-500 transition-colors"
                              title="Remove from shift"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {assignedStaff.night.length > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                      <Moon size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase w-16">Night</span>
                      <span className="text-xs text-indigo-400">(7PM-7AM)</span>
                      <div className="flex-1 flex flex-wrap gap-2">
                        {assignedStaff.night.map(staff => (
                          <div key={staff.id} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100/70 dark:bg-slate-800 rounded-full text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">{staff.full_name}</span>
                            <button
                              onClick={() => handleUnassign(staff.id, 'night')}
                              className="text-slate-400 hover:text-rose-500 transition-colors"
                              title="Remove from shift"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Shift Selection */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Select Shift{selectedShifts.length > 1 ? 's' : ''}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => toggleShift('day')}
                    disabled={assignedStaff.day.length >= 2}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all flex items-center gap-3",
                      selectedShifts.includes('day')
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30"
                        : "border-slate-200 dark:border-slate-700 hover:border-sky-300",
                      assignedStaff.day.length >= 2 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      selectedShifts.includes('day') ? "bg-sky-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      <Sun size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Day Shift</p>
                      <p className="text-xs text-slate-500">7:00 AM - 7:00 PM</p>
                      {assignedStaff.day.length > 0 && (
                        <p className="text-[10px] text-sky-600 font-medium">{assignedStaff.day.length}/2 assigned</p>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => toggleShift('night')}
                    disabled={assignedStaff.night.length >= 2}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all flex items-center gap-3",
                      selectedShifts.includes('night')
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                        : "border-slate-200 dark:border-slate-700 hover:border-indigo-300",
                      assignedStaff.night.length >= 2 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      selectedShifts.includes('night') ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      <Moon size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Night Shift</p>
                      <p className="text-xs text-slate-500">7:00 PM - 7:00 AM</p>
                      {assignedStaff.night.length > 0 && (
                        <p className="text-[10px] text-indigo-600 font-medium">{assignedStaff.night.length}/2 assigned</p>
                      )}
                    </div>
                  </button>
                </div>
                {selectedShifts.length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Select at least one shift
                  </p>
                )}
              </div>

              {/* Staff Selection */}
              <div className="space-y-3" onKeyDown={handleKeyDown}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Select Staff ({filteredStaff.length})
                  </h3>
                  {/* Show All / AI-Matched Toggle */}
                  <button
                    onClick={() => setShowAllStaff(prev => !prev)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all",
                      showAllStaff
                        ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                        : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                    )}
                    title={showAllStaff ? "Show AI-matched staff only" : "Show all active staff"}
                  >
                    {showAllStaff ? <><Users size={12} /> All Staff</> : <><Sparkles size={12} /> AI Matched</>}
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Type 2+ chars to search..."
                    value={rawSearchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                    aria-label="Search staff"
                  />
                  {rawSearchQuery && (
                    <button
                      onClick={() => { setRawSearchQuery(''); setSearchQuery(''); setFocusedIndex(-1); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter size={12} className="text-slate-400 shrink-0" />
                  {/* Category chips */}
                  {categories.slice(0, 5).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
                        filterCategory === cat
                          ? "bg-teal-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                  {categories.length > 5 && (
                    <span className="text-[10px] text-slate-400">+{categories.length - 5} more</span>
                  )}
                  {/* District chip (only show if not All) */}
                  {filterDistrict !== 'All' && (
                    <button
                      onClick={() => setFilterDistrict('All')}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 flex items-center gap-1"
                    >
                      <MapPin size={10} />{filterDistrict}
                      <X size={10} />
                    </button>
                  )}
                </div>

                {filteredStaff.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                    <Search size={32} className="text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No staff found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
                    <button
                      onClick={() => { setSearchQuery(''); setFilterCategory('All'); setFilterDistrict('All'); }}
                      className="text-xs text-teal-600 font-bold hover:underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div ref={listRef} className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar" role="listbox" aria-label="Staff list">
                      {visibleStaff.map((match, index) => {
                        const s = match.staff;
                        const isSelected = selectedStaffId === s.id;
                        const isFocused = focusedIndex === index;
                        const score = match.staff.reliability_score ?? 0;

                        return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStaffId(s.id)}
                          onMouseEnter={() => setFocusedIndex(index)}
                          className={cn(
                            "w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 text-left",
                            isSelected
                              ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 ring-1 ring-teal-500/30"
                              : isFocused
                              ? "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50"
                              : "border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800"
                          )}
                          role="option"
                          aria-selected={isSelected}
                        >
                          {/* Avatar */}
                          <div className="relative">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                              match.percentage >= 70
                                ? "bg-teal-600 text-white"
                                : match.percentage >= 40
                                ? "bg-sky-600 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            )}>
                              {s.full_name.charAt(0)}
                            </div>
                            {/* Availability dot */}
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
                              s.status === 'Active' ? "bg-emerald-500" : "bg-slate-400"
                            )} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {highlightMatch(s.full_name, searchQuery)}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <MapPin size={10} />
                                {highlightMatch(s.official_district || '—', searchQuery)}
                              </span>
                              <span className="flex items-center gap-1">
                                <UserCheck size={10} />
                                {highlightMatch(s.designation || '', searchQuery)}
                              </span>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {/* Match score */}
                            {match.percentage > 0 && (
                              <div className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black",
                                match.percentage >= 70
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              )}>
                                {match.percentage}%
                              </div>
                            )}
                            {/* Reliability badge */}
                            {score > 0 ? (
                              <div className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5",
                                score >= 80
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                  : score >= 60
                                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                                  : "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400"
                              )}>
                                {score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴'} {score}%
                              </div>
                            ) : (
                              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800">
                                ⚪ N/A
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    </div>
                    {/* Load More button */}
                    {hasMore && (
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => setShowCount(c => c + 50)}
                          className="px-4 py-2 text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-all"
                        >
                          Show More ({filteredStaff.length - showCount} remaining)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Rate Override (Hybrid Salary Model) */}
              {selectedStaff && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Shift Rate
                  </h3>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 space-y-3">
                    {/* Base rate display */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IndianRupee size={14} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">Base Rate</span>
                      </div>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        Rs. {selectedStaff.shift_rate || Math.round(selectedStaff.salary / 30)}/shift
                      </span>
                    </div>

                    {/* Override input */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          min="500"
                          max="10000"
                          step="100"
                          value={rateOverride || ''}
                          onChange={e => setRateOverride(Number(e.target.value) || 0)}
                          placeholder="Override rate..."
                          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Rs./shift</span>
                    </div>

                    {/* Rate notes */}
                    <div className="relative">
                      <FileText size={14} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={rateNotes}
                        onChange={e => setRateNotes(e.target.value)}
                        placeholder="Why rate differs (e.g. ICU premium, night-only)..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                      />
                    </div>

                    {/* Validation warning */}
                    {rateOverride > 10000 && (
                      <p className="text-xs text-rose-500 font-bold flex items-center gap-1">
                        <AlertCircle size={12} /> Rate exceeds Rs. 10,000/shift
                      </p>
                    )}
                    {rateOverride > 0 && rateOverride < 500 && (
                      <p className="text-xs text-rose-500 font-bold flex items-center gap-1">
                        <AlertCircle size={12} /> Rate below Rs. 500/shift minimum
                      </p>
                    )}
                    {rateOverride > 0 && rateOverride >= 500 && rateOverride <= 10000 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ Override active: Rs. {rateOverride.toLocaleString()}/shift
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Selection Summary */}
              {selectedStaff && selectedShifts.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Assignment Summary</p>
                  <div className="flex items-center gap-2 text-sm">
                    <UserPlus size={16} className="text-teal-600" />
                    <span className="font-bold text-slate-900 dark:text-white">{selectedStaff.full_name}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {selectedShifts.map(s => s === 'day' ? 'Day (7AM-7PM)' : 'Night (7PM-7AM)').join(' + ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <IndianRupee size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-slate-500 dark:text-slate-400">Rate:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Rs. {(rateOverride > 0 ? rateOverride : (selectedStaff.shift_rate || Math.round(selectedStaff.salary / 30))).toLocaleString()}/shift
                    </span>
                    {rateOverride > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                        OVERRIDE
                      </span>
                    )}
                    {rateNotes && (
                      <span className="text-slate-400 text-[10px] italic">— {rateNotes}</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedStaffId || selectedShifts.length === 0 || isSubmitting}
            className="flex-1 py-3 bg-teal-600 text-white rounded-2xl font-bold text-sm hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Check size={16} />
                Assign Staff
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
