import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserCheck, Star, MapPin, Clock, X, Check, AlertCircle } from 'lucide-react';
import { Staff, Patient } from '../types';
import { matchStaffToPatient, MatchResult, autoAssignStaff } from '../services/matchingService';
import { dataService } from '../dataService';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StaffMatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  allStaff: Staff[];
  onAssign: (staffId: string) => void;
}

export const StaffMatchingModal: React.FC<StaffMatchingModalProps> = ({
  isOpen,
  onClose,
  patient,
  allStaff,
  onAssign,
}) => {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [autoAssigned, setAutoAssigned] = useState<MatchResult | null>(null);

  const calculateMatches = () => {
    setIsCalculating(true);
    
    // Simulate brief delay for UX
    setTimeout(() => {
      const results = matchStaffToPatient(patient, allStaff, {
        minScore: 20,
        limit: 10,
      });
      setMatches(results);
      
      // Auto-assign best match
      const best = autoAssignStaff(patient, allStaff);
      setAutoAssigned(best);
      
      setIsCalculating(false);
    }, 500);
  };

  const handleAssign = async (match: MatchResult) => {
    try {
      // Update patient with assigned staff
      const updatedPatient = await dataService.updatePatient(patient.id, {
        assigned_staff_id: match.staff.id,
      });
      
      // Update staff availability (optional: mark as assigned)
      // This could be expanded to track assignments
      
      onAssign(match.staff.id);
      toast.success(`Assigned ${match.staff.full_name} to ${patient.full_name}`);
      onClose();
    } catch (error) {
      toast.error('Failed to assign staff');
    }
  };

  const handleAutoAssign = async () => {
    if (!autoAssigned) return;
    await handleAssign(autoAssigned);
  };

  React.useEffect(() => {
    if (isOpen && allStaff.length > 0) {
      calculateMatches();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-teal-600 to-sky-600 text-white">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Staff Matching</h2>
            <p className="text-teal-100 text-sm font-medium">
              Finding best caregivers for {patient.full_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {isCalculating ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 border-4 border-teal-100 dark:border-teal-900/30 border-t-teal-600 rounded-full animate-spin" />
              <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
                Analyzing {allStaff.length} staff members...
              </p>
            </div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <AlertCircle size={48} className="text-amber-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Suitable Matches Found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No staff members match the criteria for this patient. Try adjusting the patient's requirements.
              </p>
            </div>
          ) : (
            <>
              {/* Auto-assign suggestion */}
              {autoAssigned && (
                <div className="mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-600 rounded-xl text-white">
                      <Star size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-wider">
                        Recommended Assignment
                      </h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {autoAssigned.percentage}% match based on {allStaff.length} staff members
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-black text-xl">
                        {autoAssigned.staff.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{autoAssigned.staff.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {autoAssigned.staff.designation} • {autoAssigned.staff.official_district}
                        </p>
                        <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1">
                          {autoAssigned.reason}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleAutoAssign}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <Check size={18} />
                      Assign Now
                    </button>
                  </div>
                </div>
              )}

              {/* All matches */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  All Matches ({matches.length})
                </h3>
                
                {matches.map((match, index) => (
                  <motion.div
                    key={match.staff.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "p-5 rounded-3xl border transition-all",
                      match === autoAssigned
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg",
                          match.percentage >= 70
                            ? "bg-teal-600 text-white"
                            : match.percentage >= 40
                            ? "bg-sky-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        )}>
                          {match.staff.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{match.staff.full_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {match.staff.designation}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-black",
                          match.percentage >= 70
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                            : match.percentage >= 40
                            ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        )}>
                          {match.percentage}% Match
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {match.staff.official_district}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {match.staff.shift_preference || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck size={12} />
                        {match.staff.experience_years} years exp
                      </span>
                    </div>

                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mb-4">
                      {match.reason}
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAssign(match)}
                        className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Check size={14} />
                        Assign
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
