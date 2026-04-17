/**
 * Staff Quick View Modal
 * Lightweight staff detail focused on contact info + manual salary edit.
 * Opens from ShiftStaffDisplay when clicking a staff name.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone, MapPin, Briefcase, Edit2, Save, RotateCcw, DollarSign, ShieldCheck } from 'lucide-react';
import { Staff } from '../types';
import { dataService } from '../dataService';
import { formatPKDate, formatCNIC, formatPKPhone } from '../lib/utils';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface StaffQuickViewProps {
  staff: Staff | null;
  onClose: () => void;
  onSave: () => void;
}

const categoryColor = (cat?: string) => {
  const m: Record<string, string> = {
    Nurses: 'bg-teal-50 text-teal-700 border-teal-200',
    Midwives: 'bg-sky-50 text-sky-700 border-sky-200',
    Attendants: 'bg-amber-50 text-amber-700 border-amber-200',
    Doctors: 'bg-rose-50 text-rose-700 border-rose-200',
    Technical: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Management: 'bg-purple-50 text-purple-700 border-purple-200',
    Other: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return m[cat || 'Other'] || m.Other;
};

export const StaffQuickView = ({ staff, onClose, onSave }: StaffQuickViewProps) => {
  const [editingRate, setEditingRate] = useState(false);
  const [editRate, setEditRate] = useState(0);
  const [saving, setSaving] = useState(false);

  if (!staff) return null;

  const baseRate = staff.shift_rate || Math.round((staff.salary || 30000) / 30);

  const handleSaveRate = async () => {
    if (editRate < 0) { toast.error('Rate cannot be negative'); return; }
    setSaving(true);
    try {
      await dataService.updateStaff(staff.id, { shift_rate: editRate });
      onSave();
      setEditingRate(false);
      toast.success(`${staff.full_name}: rate updated to Rs. ${editRate.toLocaleString('en-PK')}/shift`);
    } catch (e) {
      toast.error('Failed to update rate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-teal-600 to-sky-600 text-white relative">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-[24px] bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-2xl border border-white/30">
                {(staff.full_name || '?').charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">{staff.full_name || 'Unnamed'}</h2>
                <p className="text-teal-100 text-sm font-medium">{staff.designation || '—'}</p>
                <span className={cn("inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border", categoryColor(staff.category))}>
                  {staff.category || 'Other'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
            {/* Status */}
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-slate-400" />
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border",
                staff.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                staff.status === 'On Leave' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-slate-50 text-slate-600 border-slate-200'
              )}>
                {staff.status || 'Unknown'}
              </span>
            </div>

            {/* Contact */}
            <section className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Phone size={12} /> Contact
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                  <p className="font-bold">{staff.contact_1 ? formatPKPhone(staff.contact_1) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Alt / WhatsApp</p>
                  <p className="font-bold">{staff.alt_number || staff.whatsapp || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">CNIC</p>
                  <p className="font-bold">{staff.cnic ? formatCNIC(staff.cnic) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Area</p>
                  <p className="font-bold">{staff.residential_area || '—'}</p>
                </div>
              </div>
            </section>

            {/* Professional */}
            <section className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={12} /> Professional
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Qualification</p>
                  <p className="font-bold">{staff.qualification || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Experience</p>
                  <p className="font-bold">{staff.experience_years ? `${staff.experience_years} years` : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Hire Date</p>
                  <p className="font-bold">{staff.hire_date ? formatPKDate(staff.hire_date) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Shift Pref</p>
                  <p className="font-bold">{staff.shift_preference || '—'}</p>
                </div>
              </div>
            </section>

            {/* Salary / Rate (Editable) */}
            <section className={cn("p-4 rounded-2xl border", editingRate ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent')}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                <DollarSign size={12} /> Salary & Rate
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Monthly Salary</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">
                      {staff.salary ? `Rs. ${staff.salary.toLocaleString('en-PK')}` : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Rate / Shift</p>
                    {editingRate ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editRate}
                          onChange={(e) => setEditRate(parseInt(e.target.value) || 0)}
                          className="w-24 text-right text-lg font-black bg-white dark:bg-slate-900 rounded-xl px-3 py-1 border border-teal-300 focus:ring-2 focus:ring-teal-500"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRate(); if (e.key === 'Escape') { setEditingRate(false); setEditRate(baseRate); } }}
                        />
                        <button onClick={handleSaveRate} disabled={saving} className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
                          <Save size={14} />
                        </button>
                        <button onClick={() => { setEditingRate(false); setEditRate(baseRate); }} className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-lg font-black text-teal-600 dark:text-teal-400">
                        Rs. {baseRate.toLocaleString('en-PK')}
                      </p>
                    )}
                  </div>
                </div>
                {!editingRate && (
                  <button
                    onClick={() => { setEditingRate(true); setEditRate(baseRate); }}
                    className="w-full py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} />
                    Edit Shift Rate
                  </button>
                )}
              </div>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
