import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UserRound,
  Search,
  Plus,
  Filter,
  Download,
  LayoutGrid,
  List,
  Phone,
  MessageSquare,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Stethoscope,
  Activity,
  X,
  FileText,
  CreditCard,
  Briefcase,
  ShieldCheck,
  PhoneCall,
  Map,
  Trash2,
  Edit2,
  Eye,
  ArrowUpDown,
  Heart,
  Calendar,
  History,
  ClipboardList,
  UserCheck,
  Camera,
  Sparkles,
  Sun,
  Moon,
  BedDouble,
  Repeat,
  AlertTriangle,
  Skull,
  HeartOff,
  FileX,
  DollarSign,
  ReceiptText,
  Receipt,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUIStore } from '../store';
import { dataService } from '../dataService';
import { Patient, District, PatientStatus, PatientEndReason, Staff } from '../types';
import { format } from 'date-fns';
import { formatPKR, formatPKDate, formatCNIC, formatPKPhone, autoFormatCNIC, autoFormatPhone } from '../lib/utils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ShiftStaffDisplay } from './ShiftStaffDisplay';
import { StaffQuickView } from './StaffQuickView';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { dutyService } from '../services/dutyService';
import { geminiService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { ConfirmationModal } from './ConfirmationModal';
import { CameraCapture } from './CameraCapture';
import { StaffMatchingModal } from './StaffMatchingModal';
import { ShiftAssignmentModal } from './ShiftAssignmentModal';
import { WhatsAppOnboardingModal } from './WhatsAppOnboardingModal';
import { matchStaffToPatient, MatchResult } from '../services/matchingService';
import { getKarachiToday } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import { patientAdvancesService } from '../services/patientAdvancesService';
import { generateAdvanceInvoice } from '../utils/generateInvoicePdf';
import { PatientAdvance, ServiceCategory, AcuityLevel, SERVICE_CATEGORY_LABELS, ACUITY_LABELS, ACUITY_COLORS } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types & Constants ---

const DISTRICTS: District[] = [
  'Karachi Central',
  'Karachi East',
  'Karachi South',
  'Karachi West',
  'Korangi',
  'Malir',
  'Keamari'
];

// --- Form Schema ---

const patientSchema = z.object({
  full_name: z.string().min(3, 'Full name is required'),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'Invalid CNIC format (XXXXX-XXXXXXX-X)'),
  contact: z.string().regex(/^(\+92\s?3\d{2}\s?\d{7}|03\d{2}-?\d{7}|923\d{9})$/, 'Invalid phone format (+92 3XX XXXXXXX or 03XX-XXXXXXX)'),
  alt_contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  address: z.string().min(10, 'Address is too short'),
  area: z.string().optional(),
  city: z.string().optional(),
  district: z.string().default('Karachi South'),
  status: z.string().default('Active'),
  admission_date: z.string().default(getKarachiToday()),
  date_of_birth: z.string().optional().transform(val => val === '' ? undefined : val),
  age: z.string().optional().transform(val => val ? parseInt(val) || undefined : undefined),
  gender: z.enum(['Male', 'Female']).optional().default('Male'),
  blood_group: z.string().optional(),
  marital_status: z.string().optional(),
  guardian_name: z.string().min(3, 'Guardian name is required'),
  guardian_contact: z.string().regex(/^(\+92\s?3\d{2}\s?\d{7}|03\d{2}-?\d{7}|923\d{9})$/, 'Invalid phone format (+92 3XX XXXXXXX or 03XX-XXXXXXX)'),
  guardian_cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'Invalid CNIC format (XXXXX-XXXXXXX-X)'),
  guardian_relationship: z.string().default('Son'),
  medical_condition: z.string().min(5, 'Medical condition is required'),
  primary_diagnosis: z.string().optional(),
  current_condition: z.string().optional(),
  current_medications: z.string().optional(),
  allergies: z.string().optional(),
  medical_requirements: z.array(z.string()).optional(),
  equipment_requirements: z.array(z.string()).optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  doctor_name: z.string().optional(),
  doctor_specialty: z.string().optional(),
  doctor_hospital: z.string().optional(),
  doctor_phone: z.string().optional(),
  doctor_notes: z.string().optional(),
  special_requirements: z.string().optional(),
  service_type: z.string().default('24/7 Nursing Care'),
  frequency: z.string().default('Daily'),
  duration: z.string().default('30 Days'),
  // Clinical metadata for market research
  service_category: z.string().optional(),
  acuity_level: z.number().optional(),
  primary_condition: z.string().optional(),
  comorbidities: z.string().optional(),
  special_equipment: z.string().optional(),
  mobility_status: z.string().optional(),
  billing_package: z.string().default('Standard'),
  billing_rate: z.number().min(0).default(0),
  payment_method: z.string().default('Cash'),
  advance_payment_received: z.boolean().default(false),
  advance_payment_date: z.string().optional(),
  cnic_image_urls: z.array(z.string()).optional(),
  form_image_urls: z.array(z.string()).optional(),
});

// --- Components ---

const StatusBadge = ({ status }: { status: PatientStatus }) => {
  const colors: Record<PatientStatus, string> = {
    Active: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800",
    Discharged: "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-800",
    Pending: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800",
    Deceased: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800",
    Cancelled: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800",
    Dissatisfied: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800"
  };
  
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider",
      colors[status]
    )}>
      {status}
    </span>
  );
};

/**
 * ShiftStaffDisplay is imported from ./ShiftStaffDisplay.tsx
 * Shows assigned staff with rate per shift and monthly attendance calendar.
 */

const PatientCard = ({ patient, staff, onClick, onEdit, onUpdate, onMatch, onEndServices }: {
  patient: Patient,
  staff: Staff[],
  onClick: () => void,
  onEdit: () => void,
  onUpdate: (id: string, data: any) => Promise<void>,
  onMatch: (patient: Patient) => void,
  onEndServices: (patient: Patient) => void,
}) => {
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState({
    full_name: patient.full_name,
    status: patient.status,
    billing_rate: patient.billing_rate
  });
  const [isSaving, setIsSaving] = useState(false);
  const [dayStaff, setDayStaff] = useState<Staff[]>([]);
  const [nightStaff, setNightStaff] = useState<Staff[]>([]);

  // Fetch today's duty assignments for this patient (up to 2 per shift)
  React.useEffect(() => {
    if (!supabase) return;
    const today = getKarachiToday();
    const staffIds = new Set(staff.map(s => s.id));
    supabase
      .from('duty_assignments')
      .select('staff_id, shift_type, status')
      .eq('patient_id', patient.id)
      .eq('duty_date', today)
      .in('status', ['assigned', 'confirmed', 'completed'])
      .then(({ data, error }) => {
        if (error || !data) return;
        const dayIds = data.filter(a => a.shift_type === 'day').map(a => a.staff_id);
        const nightIds = data.filter(a => a.shift_type === 'night').map(a => a.staff_id);
        setDayStaff(staff.filter(s => staffIds.has(s.id) && dayIds.includes(s.id)));
        setNightStaff(staff.filter(s => staffIds.has(s.id) && nightIds.includes(s.id)));
      });
  }, [patient.id, staff.length]); // Use staff.length to avoid re-fetch on array reference changes

  const hasChanges = 
    editBuffer.full_name !== patient.full_name || 
    editBuffer.status !== patient.status || 
    editBuffer.billing_rate !== patient.billing_rate;

  const handleSave = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (!hasChanges) return;
    setIsSaving(true);
    try {
      await onUpdate(patient.id, editBuffer);
      setIsQuickEditing(false);
      toast.success('Patient updated successfully');
    } catch (error) {
      toast.error('Failed to update patient');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hasChanges) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsQuickEditing(false);
    }
  };
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={!isQuickEditing ? { y: -5 } : {}}
      onClick={!isQuickEditing ? onClick : undefined}
      className={cn(
        "bg-white dark:bg-slate-900 border p-6 rounded-3xl shadow-sm transition-all relative overflow-hidden",
        isQuickEditing ? "border-sky-500 ring-2 ring-sky-500/10" : "border-slate-100 dark:border-slate-800 hover:shadow-xl cursor-pointer group"
      )}
    >
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button 
          onClick={(e) => { e.stopPropagation(); setIsQuickEditing(!isQuickEditing); }}
          className={cn(
            "p-2 rounded-xl transition-colors",
            isQuickEditing ? "bg-sky-600 text-white" : "hover:bg-sky-50 text-slate-400 hover:text-sky-600"
          )}
          title={isQuickEditing ? "Cancel Editing" : "Quick Edit"}
        >
          {isQuickEditing ? <X size={16} /> : <Edit2 size={16} />}
        </button>
        {!isQuickEditing && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-sky-600 transition-colors"
            title="Full Edit"
          >
            <MoreVertical size={16} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 flex items-center justify-center text-sky-600 dark:text-sky-400 font-black text-2xl shadow-inner border border-white dark:border-slate-800">
          {patient.full_name.charAt(0)}
        </div>
        <div className="flex-1">
          {isQuickEditing ? (
            <input
              autoFocus
              value={editBuffer.full_name}
              onChange={(e) => setEditBuffer(prev => ({ ...prev, full_name: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-sm font-bold focus:ring-2 focus:ring-sky-500 dark:text-white"
            />
          ) : (
            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{patient.full_name}</h4>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{patient.medical_condition}</p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
            <MapPin size={10} />
            {patient.district}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-1.5 flex-1">
          {isQuickEditing ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <select
                value={editBuffer.status}
                onChange={(e) => setEditBuffer(prev => ({ ...prev, status: e.target.value as PatientStatus }))}
                className="w-full bg-slate-50 border-none rounded-lg px-2 py-1 text-[10px] font-bold uppercase focus:ring-2 focus:ring-sky-500"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Discharged">Discharged (Recovered)</option>
                <option value="Deceased">Deceased</option>
                <option value="Cancelled">Contract Cancelled</option>
                <option value="Dissatisfied">Dissatisfied</option>
              </select>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400">Rs.</span>
                <input
                  type="number"
                  value={editBuffer.billing_rate}
                  onChange={(e) => setEditBuffer(prev => ({ ...prev, billing_rate: Number(e.target.value) }))}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-slate-50 border-none rounded-lg px-2 py-1 text-[10px] font-bold focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          ) : (
            <>
              <StatusBadge status={patient.status} />
              {patient.advance_payment_received ? (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-tighter border border-emerald-100 w-fit">
                  Advance Paid
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md text-[9px] font-black uppercase tracking-tighter border border-rose-100 w-fit">
                  Advance Pending
                </span>
              )}
            </>
          )}
        </div>
        {!isQuickEditing && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <Calendar size={10} />
            Admitted {formatPKDate(patient.admission_date)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isQuickEditing && hasChanges && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-4"
          >
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-2.5 bg-sky-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-200 hover:bg-sky-700 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Save Changes
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!isQuickEditing && (
        <>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Today's Shift Staff</p>

            {/* Day Shift Staff */}
            <div className="flex items-start gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800 mb-2">
              <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                <Sun size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">☀️ Day (7AM-7PM)</p>
                {dayStaff.length > 0 ? (
                  <div className="space-y-1 mt-1">
                    {dayStaff.map(s => (
                      <p key={s.id} className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.full_name} <span className="text-[10px] font-normal text-slate-500">({s.designation})</span></p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-1">Not assigned</p>
                )}
              </div>
            </div>

            {/* Night Shift Staff */}
            <div className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                <Moon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">🌙 Night (7PM-7AM)</p>
                {nightStaff.length > 0 ? (
                  <div className="space-y-1 mt-1">
                    {nightStaff.map(s => (
                      <p key={s.id} className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.full_name} <span className="text-[10px] font-normal text-slate-500">({s.designation})</span></p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-1">Not assigned</p>
                )}
              </div>
            </div>

            {/* Service type badge */}
            {patient.service_type && (
              <span className="inline-block px-2 py-0.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-md text-[9px] font-black uppercase tracking-tighter border border-sky-100 dark:border-sky-800">
                {patient.service_type}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); window.open(`tel:${patient.contact}`); }}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-600 dark:hover:text-sky-400 transition-all border border-slate-100 dark:border-slate-700"
            >
              <Phone size={14} />
              Call
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${patient.contact.replace(/\s+/g, '')}`); }}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all border border-slate-100 dark:border-slate-700"
            >
              <MessageSquare size={14} />
              WhatsApp
            </button>
          </div>

          {/* End Services button — only for Active/Pending patients */}
          {(patient.status === 'Active' || patient.status === 'Pending') && (
            <button
              onClick={(e) => { e.stopPropagation(); onEndServices(patient); }}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all border border-rose-100 dark:border-rose-800/50"
            >
              <AlertTriangle size={14} />
              End Services
            </button>
          )}

          {/* End reason badge — shown when patient has an end reason */}
          {patient.end_reason && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Services Ended</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {patient.end_reason === 'recovered' && '✓ Recovered — No staff needed'}
                {patient.end_reason === 'deceased' && '✝ Patient Deceased'}
                {patient.end_reason === 'contract_cancelled' && '✗ Contract Cancelled by Family'}
                {patient.end_reason === 'dissatisfied' && '! Not Satisfied with Services'}
              </p>
              {patient.end_date && (
                <p className="text-[10px] text-slate-400 mt-1">Ended: {formatPKDate(patient.end_date)}</p>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

// --- End Services Modal ---

const END_OPTIONS = [
  {
    value: 'recovered' as const,
    label: 'Recovered',
    description: 'Patient has recovered — no staff needed anymore',
    status: 'Discharged' as PatientStatus,
    icon: Heart,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
  },
  {
    value: 'deceased' as const,
    label: 'Patient Deceased',
    description: 'Patient has passed away',
    status: 'Deceased' as PatientStatus,
    icon: Skull,
    color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/30'
  },
  {
    value: 'contract_cancelled' as const,
    label: 'Contract Cancelled',
    description: 'Patient\'s family cancelled the contract',
    status: 'Cancelled' as PatientStatus,
    icon: FileX,
    color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30'
  },
  {
    value: 'dissatisfied' as const,
    label: 'Not Satisfied',
    description: 'Family not satisfied with services or staff',
    status: 'Dissatisfied' as PatientStatus,
    icon: HeartOff,
    color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/30'
  }
];

const EndServicesModal = ({
  isOpen,
  onClose,
  patient,
  onEnd
}: {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onEnd: (reason: PatientEndReason, notes: string) => Promise<void>;
}) => {
  const [selected, setSelected] = useState<PatientEndReason>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected) {
      toast.error('Please select a reason');
      return;
    }
    setIsSubmitting(true);
    try {
      await onEnd(selected, notes);
      setSelected(null);
      setNotes('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelected(null);
    setNotes('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">End Services</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{patient.full_name}</p>
                  </div>
                </div>
                <button onClick={handleCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Why are services ending?</p>
              {END_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selected === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setSelected(option.value)}
                    className={cn(
                      "w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                      isSelected
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20 shadow-lg shadow-sky-100 dark:shadow-sky-900/10"
                        : option.color
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      isSelected
                        ? "bg-sky-600 text-white"
                        : "bg-white dark:bg-slate-800",
                      option.color.split(' ')[0]
                    )}>
                      <Icon size={20} className={isSelected ? "text-white" : option.color.split(' ')[0]} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-bold",
                        isSelected ? "text-sky-900 dark:text-sky-100" : "text-slate-900 dark:text-white"
                      )}>
                        {option.label}
                      </p>
                      <p className={cn(
                        "text-xs mt-0.5",
                        isSelected ? "text-sky-700 dark:text-sky-300" : "text-slate-500 dark:text-slate-400"
                      )}>
                        {option.description}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={20} className="text-sky-600 dark:text-sky-400 flex-shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Optional notes */}
            <div className="px-6 pb-4">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                Additional Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any details about this case..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent dark:text-white resize-none"
              />
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selected || isSubmitting}
                className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <AlertTriangle size={16} />
                )}
                Confirm End Services
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AddPatientForm = ({ isOpen, onClose, onAdd, initialData }: any) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraType, setCameraType] = useState<'cnic' | 'form'>('cnic');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [skipAI, setSkipAI] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: initialData || {
      district: 'Karachi South',
      status: 'Active',
      gender: 'Male',
      admission_date: getKarachiToday(),
      billing_rate: 0,
      payment_method: 'Cash',
      advance_payment_received: false,
      advance_payment_date: getKarachiToday(),
      service_type: '24/7 Nursing Care',
      frequency: 'Daily',
      duration: '30 Days'
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset(initialData);
      } else {
        reset({
          district: 'Karachi South',
          status: 'Active',
          gender: 'Male',
          admission_date: getKarachiToday(),
          billing_rate: 0,
          payment_method: 'Cash',
          advance_payment_received: false,
          advance_payment_date: getKarachiToday(),
          service_type: '24/7 Nursing Care',
          frequency: 'Daily',
          duration: '30 Days'
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const handleCapture = async (data: string | string[]) => {
    const images = Array.isArray(data) ? data : [data];
    const field = cameraType === 'cnic' ? 'cnic_image_urls' : 'form_image_urls';
    
    const currentImages = watch(field as any) || [];
    setValue(field as any, [...currentImages, ...images]);

    if (skipAI) return;

    // Use the first new image for AI extraction
    const base64 = images[0];
    setIsExtracting(true);
    const loadingToast = toast.loading("AI is extracting data from image...");
    
    try {
      const extractedData = await geminiService.extractDataFromImage(base64, 'patient');
      
      if (extractedData) {
        if (extractedData.full_name) setValue('full_name', extractedData.full_name);
        if (extractedData.cnic) setValue('cnic', extractedData.cnic);
        if (extractedData.contact) setValue('contact', extractedData.contact);
        if (extractedData.address) setValue('address', extractedData.address);
        if (extractedData.date_of_birth) setValue('date_of_birth', extractedData.date_of_birth);
        if (extractedData.age) setValue('age', parseInt(extractedData.age));
        if (extractedData.gender) setValue('gender', extractedData.gender);
        if (extractedData.guardian_name) setValue('guardian_name', extractedData.guardian_name);
        if (extractedData.guardian_contact) setValue('guardian_contact', extractedData.guardian_contact);
        if (extractedData.guardian_cnic) setValue('guardian_cnic', extractedData.guardian_cnic);
        if (extractedData.medical_condition) setValue('medical_condition', extractedData.medical_condition);
        
        toast.success("Data extracted successfully!", { id: loadingToast });
      } else {
        toast.error("Could not extract data from this image.", { id: loadingToast });
      }
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("AI extraction failed. Please enter data manually.", { id: loadingToast });
    } finally {
      setIsExtracting(false);
    }
  };

  const onSubmit = (data: any) => {
    onAdd(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
        className="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-sky-600 text-white">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Patient Registration</h2>
            <p className="text-sky-100 text-sm font-medium">Register a new patient for home care services.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form id="add-patient-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* AI Extraction */}
            <div className="flex gap-4 mb-8">
              <button 
                type="button"
                onClick={() => { setCameraType('cnic'); setIsBatchMode(false); setSkipAI(false); setIsCameraOpen(true); }}
                className="flex-1 flex flex-col items-center justify-center p-6 bg-sky-50 border-2 border-dashed border-sky-200 rounded-[32px] hover:bg-sky-100 transition-all group"
              >
                <Camera size={28} className="text-sky-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Scan CNIC</span>
              </button>
              <button 
                type="button"
                onClick={() => { setCameraType('cnic'); setIsBatchMode(true); setSkipAI(false); setIsCameraOpen(true); }}
                className="flex-1 flex flex-col items-center justify-center p-6 bg-teal-50 border-2 border-dashed border-teal-200 rounded-[32px] hover:bg-teal-100 transition-all group"
              >
                <Camera size={28} className="text-teal-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Batch Scan</span>
              </button>
              <button 
                type="button"
                onClick={() => { setCameraType('form'); setIsBatchMode(true); setSkipAI(true); setIsCameraOpen(true); }}
                className="flex-1 flex flex-col items-center justify-center p-6 bg-amber-50 border-2 border-dashed border-amber-200 rounded-[32px] hover:bg-amber-100 transition-all group"
              >
                <Camera size={28} className="text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Batch Photos</span>
              </button>
              <button 
                type="button"
                onClick={() => { setCameraType('form'); setIsBatchMode(false); setSkipAI(false); setIsCameraOpen(true); }}
                className="flex-1 flex flex-col items-center justify-center p-6 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-[32px] hover:bg-indigo-100 transition-all group"
              >
                <FileText size={28} className="text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Scan Form</span>
              </button>
            </div>

            {/* Image Previews */}
            {(watch('cnic_image_urls')?.length > 0 || watch('form_image_urls')?.length > 0) && (
              <div className="space-y-4">
                {watch('cnic_image_urls')?.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CNIC Images ({watch('cnic_image_urls').length})</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {watch('cnic_image_urls').map((url: string, idx: number) => (
                        <div key={idx} className="relative w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 group">
                          <img src={url} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => {
                              const current = watch('cnic_image_urls');
                              setValue('cnic_image_urls', current.filter((_: any, i: number) => i !== idx));
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {watch('form_image_urls')?.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Form Images ({watch('form_image_urls').length})</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {watch('form_image_urls').map((url: string, idx: number) => (
                        <div key={idx} className="relative w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 group">
                          <img src={url} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => {
                              const current = watch('form_image_urls');
                              setValue('form_image_urls', current.filter((_: any, i: number) => i !== idx));
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
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

            {/* Patient Details */}
            <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <UserRound size={14} />
                Patient Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                  <input {...register('full_name')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.full_name && "ring-2 ring-rose-500 bg-rose-50")} placeholder="e.g. Zubair Ali" />
                  {errors.full_name && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.full_name.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CNIC Number *</label>
                  <input
                    {...register('cnic')}
                    onChange={(e) => setValue('cnic', autoFormatCNIC(e.target.value))}
                    className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.cnic && "ring-2 ring-rose-500 bg-rose-50")}
                    placeholder="XXXXX-XXXXXXX-X"
                  />
                  {errors.cnic && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.cnic.message as string}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Number *</label>
                  <input
                    {...register('contact')}
                    onChange={(e) => setValue('contact', autoFormatPhone(e.target.value))}
                    className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.contact && "ring-2 ring-rose-500 bg-rose-50")}
                    placeholder="03XX-XXXXXXX"
                  />
                  {errors.contact && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.contact.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">District *</label>
                  <select {...register('district')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500">
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Address *</label>
                <textarea {...register('address')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 min-h-[80px]", errors.address && "ring-2 ring-rose-500 bg-rose-50")} placeholder="Complete residential address in Karachi" />
                {errors.address && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.address.message as string}</p>}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                  <input {...register('date_of_birth')} type="date" className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Age</label>
                  <input {...register('age')} type="text" className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500" placeholder="e.g. 45" />
                </div>
              </div>
            </section>

            {/* Guardian Details */}
            <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} />
                Guardian Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Guardian Name *</label>
                  <input {...register('guardian_name')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.guardian_name && "ring-2 ring-rose-500 bg-rose-50")} />
                  {errors.guardian_name && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.guardian_name.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Relationship *</label>
                  <input {...register('guardian_relationship')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.guardian_relationship && "ring-2 ring-rose-500 bg-rose-50")} placeholder="e.g. Son, Daughter, Spouse" />
                  {errors.guardian_relationship && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.guardian_relationship.message as string}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Guardian Contact *</label>
                  <input
                    {...register('guardian_contact')}
                    onChange={(e) => setValue('guardian_contact', autoFormatPhone(e.target.value))}
                    className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.guardian_contact && "ring-2 ring-rose-500 bg-rose-50")}
                    placeholder="03XX-XXXXXXX"
                  />
                  {errors.guardian_contact && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.guardian_contact.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Guardian CNIC *</label>
                  <input
                    {...register('guardian_cnic')}
                    onChange={(e) => setValue('guardian_cnic', autoFormatCNIC(e.target.value))}
                    className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.guardian_cnic && "ring-2 ring-rose-500 bg-rose-50")}
                    placeholder="XXXXX-XXXXXXX-X"
                  />
                  {errors.guardian_cnic && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.guardian_cnic.message as string}</p>}
                </div>
              </div>
            </section>

            {/* Medical & Service */}
            <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Heart size={14} />
                Medical & Service Requirements
              </h3>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medical Condition *</label>
                <textarea {...register('medical_condition')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 min-h-[80px]", errors.medical_condition && "ring-2 ring-rose-500 bg-rose-50")} placeholder="Brief description of the patient's condition" />
                {errors.medical_condition && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.medical_condition.message as string}</p>}
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Type *</label>
                  <select {...register('service_type')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.service_type && "ring-2 ring-rose-500 bg-rose-50")}>
                    <option>24/7 Nursing Care</option>
                    <option>12/7 Nursing Care</option>
                    <option>Attendant Service</option>
                    <option>Physiotherapy</option>
                  </select>
                  {errors.service_type && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.service_type.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frequency *</label>
                  <select {...register('frequency')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.frequency && "ring-2 ring-rose-500 bg-rose-50")}>
                    <option>Daily</option>
                    <option>Alternate Days</option>
                    <option>Weekly</option>
                  </select>
                  {errors.frequency && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.frequency.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration *</label>
                  <input {...register('duration')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.duration && "ring-2 ring-rose-500 bg-rose-50")} placeholder="e.g. 30 Days" />
                  {errors.duration && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.duration.message as string}</p>}
                </div>
              </div>
              {/* Clinical Metadata for Market Research */}
              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Category</label>
                  <select {...register('service_category')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500">
                    <option value="">Select category...</option>
                    {(Object.entries(SERVICE_CATEGORY_LABELS) as [ServiceCategory, string][]).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Care Acuity Level</label>
                  <select {...register('acuity_level', { valueAsNumber: true })} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500">
                    <option value="">Select acuity...</option>
                    {([1, 2, 3, 4, 5] as AcuityLevel[]).map((level) => (
                      <option key={level} value={level}>{level} - {ACUITY_LABELS[level]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobility Status</label>
                  <select {...register('mobility_status')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500">
                    <option value="">Select mobility...</option>
                    <option value="independent">Independent</option>
                    <option value="assisted">Assisted</option>
                    <option value="wheelchair">Wheelchair</option>
                    <option value="bed_bound">Bed Bound</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Billing */}
            <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={14} />
                Billing Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                  <select {...register('status')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500">
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Discharged">Discharged (Recovered)</option>
                    <option value="Deceased">Deceased</option>
                    <option value="Cancelled">Contract Cancelled</option>
                    <option value="Dissatisfied">Dissatisfied</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Rate (PKR) *</label>
                  <input type="number" {...register('billing_rate', { valueAsNumber: true })} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.billing_rate && "ring-2 ring-rose-500 bg-rose-50")} />
                  {errors.billing_rate && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.billing_rate.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Method *</label>
                  <select {...register('payment_method')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.payment_method && "ring-2 ring-rose-500 bg-rose-50")}>
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>JazzCash / EasyPaisa</option>
                  </select>
                  {errors.payment_method && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.payment_method.message as string}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <input 
                    type="checkbox" 
                    {...register('advance_payment_received')} 
                    className="w-5 h-5 rounded-lg border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">Advance Payment Received</label>
                    <p className="text-[10px] text-slate-500 font-medium italic">Required for one month package</p>
                  </div>
                </div>
                {watch('advance_payment_received') && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Date</label>
                    <input 
                      type="date" 
                      {...register('advance_payment_date')} 
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500" 
                    />
                  </div>
                )}
              </div>
            </section>
          </form>
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-between bg-slate-50">
          <button 
            type="button"
            onClick={onClose}
            className="px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => document.getElementById('add-patient-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            className="px-8 py-3 bg-sky-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-sky-200 hover:scale-105 transition-all"
          >
            {initialData?.id ? 'Update Patient' : 'Register Patient'}
          </button>
        </div>
      </motion.div>

      {isCameraOpen && (
        <CameraCapture 
          title={cameraType === 'cnic' ? (isBatchMode ? "Batch Scan CNIC" : "Scan Patient CNIC") : "Scan Admission Form"}
          multiple={isBatchMode}
          onCapture={handleCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
};

// --- Module ---

export const PatientModule = () => {
  const queryClient = useQueryClient();
  const { searchQuery, patientFilters, setPatientFilters } = useUIStore();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Staff matching modal state (legacy, kept for duty roster)
  const [isMatchingOpen, setIsMatchingOpen] = useState(false);
  const [matchingPatient, setMatchingPatient] = useState<Patient | null>(null);

  // Shift assignment modal state (for "Assign Now" button)
  const [isShiftAssignOpen, setIsShiftAssignOpen] = useState(false);
  const [shiftAssignPatient, setShiftAssignPatient] = useState<Patient | null>(null);
  const [shiftAssignRefreshKey, setShiftAssignRefreshKey] = useState(0);
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);

  // ...

  // View staff profile
  const handleViewStaff = (staff: Staff) => {
    setViewingStaff(staff);
  };

  // Unassign staff from shift
  const handleUnassignStaff = async (staffId: string, staffName: string, shiftType: 'day' | 'night') => {
    const confirmed = window.confirm(`Remove ${staffName} from ${shiftType === 'day' ? 'Day' : 'Night'} shift?`);
    if (!confirmed) return;
    try {
      await dutyService.unassignStaffFromShift(selectedPatient.id, staffId, shiftType);
      toast.success(`Removed ${staffName} from ${shiftType} shift`);
      setShiftAssignRefreshKey(k => k + 1);
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ['on-duty-count'] });
    } catch {
      toast.error('Failed to remove staff from shift');
    }
  };
  // End services modal state
  const [isEndServicesOpen, setIsEndServicesOpen] = useState(false);
  const [endServicesPatient, setEndServicesPatient] = useState<Patient | null>(null);

  // WhatsApp onboarding modal state
  const [isWhatsAppOnboardingOpen, setIsWhatsAppOnboardingOpen] = useState(false);

  // Patient advance / invoice modal state
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advancePatient, setAdvancePatient] = useState<Patient | null>(null);
  const [patientAdvances, setPatientAdvances] = useState<PatientAdvance[]>([]);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceMethod, setAdvanceMethod] = useState('Cash');
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [advanceDate, setAdvanceDate] = useState(getKarachiToday());
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  React.useEffect(() => {
    setAnalysisResult(null);
  }, [selectedPatient]);

  const handleAnalyzeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await geminiService.analyzeImage(base64, "Analyze this medical report or patient photo and provide a summary of findings and recommendations for home care.");
        setAnalysisResult(result);
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to analyze image");
      setIsAnalyzing(false);
    }
  };

  // Use React Query for cached, deduplicated patient data
  const { data: queryPatients = [], isLoading: isPatientLoading, refetch } = useQuery({
    queryKey: ['patients'],
    queryFn: dataService.getPatients,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync query data to local state for filtering
  React.useEffect(() => {
    if (queryPatients.length > 0) setPatients(queryPatients);
  }, [queryPatients]);

  // Fetch staff for caregiver display
  const { data: queryStaff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: dataService.getStaff,
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (queryStaff.length > 0) setStaff(queryStaff);
  }, [queryStaff]);

  const isLoading = isPatientLoading;

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.cnic.includes(searchQuery) ||
                           p.contact.includes(searchQuery);
      
      const matchesDistrict = patientFilters.district === 'All' || p.district === patientFilters.district;
      const matchesStatus = patientFilters.status === 'All' || p.status === patientFilters.status;
      
      return matchesSearch && matchesDistrict && matchesStatus;
    });
  }, [patients, searchQuery, patientFilters]);

  const handleAddPatient = async (data: any) => {
    try {
      const newPatient = await dataService.addPatient({
        ...data,
        admission_date: data.admission_date || getKarachiToday(),
        billing_package: data.billing_package || 'Standard',
      });
      setPatients([newPatient, ...patients]);
      toast.success('Patient registered successfully!');
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding patient:', error);
      toast.error('Failed to register patient. Please try again.');
    }
  };

  const handleUpdatePatient = async (data: any) => {
    if (!selectedPatient) return;
    try {
      const updatedPatient = await dataService.updatePatient(selectedPatient.id, data);
      setPatients(patients.map(p => p.id === selectedPatient.id ? updatedPatient : p));
      setSelectedPatient(updatedPatient);
      setIsEditModalOpen(false);
      toast.success('Patient profile updated successfully!');
    } catch (error) {
      console.error('Error updating patient:', error);
      toast.error('Failed to update patient profile. Please try again.');
    }
  };

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;

    try {
      await dataService.deletePatient(patientToDelete.id);
      setPatients(patients.filter(p => p.id !== patientToDelete.id));
      toast.success('Patient record deleted successfully');
      setPatientToDelete(null);
      setSelectedPatient(null);
    } catch (error) {
      toast.error('Failed to delete patient record');
    }
  };

  const handleEndServices = async (reason: PatientEndReason, notes: string) => {
    if (!endServicesPatient) return;

    const endOption = END_OPTIONS.find(o => o.value === reason);
    const status = endOption?.status || 'Discharged';

    try {
      const updateData: Partial<Patient> = {
        status,
        end_reason: reason,
        end_date: getKarachiToday(),
        end_notes: notes || undefined,
      };

      const updatedPatient = await dataService.updatePatient(endServicesPatient.id, updateData);
      setPatients(patients.map(p => p.id === endServicesPatient.id ? updatedPatient : p));

      const reasonLabels: Record<string, string> = {
        recovered: 'Recovered',
        deceased: 'Deceased',
        contract_cancelled: 'Contract Cancelled',
        dissatisfied: 'Dissatisfied',
      };

      toast.success(`Services ended — ${reasonLabels[reason || ''] || 'Unknown'}`);
      setEndServicesPatient(null);
    } catch (error) {
      console.error('Error ending services:', error);
      toast.error('Failed to end services. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Patient Care</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Monitoring {patients.length} home-care patients across Karachi.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <button 
              onClick={() => setView('grid')}
              className={cn("p-2 rounded-xl transition-all", view === 'grid' ? "bg-sky-600 text-white shadow-md" : "text-slate-400 hover:text-sky-600 dark:hover:text-sky-400")}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn("p-2 rounded-xl transition-all", view === 'list' ? "bg-sky-600 text-white shadow-md" : "text-slate-400 hover:text-sky-600 dark:hover:text-sky-400")}
            >
              <List size={20} />
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:border-sky-600 hover:text-sky-600 dark:hover:text-sky-400 transition-all shadow-sm">
            <Download size={18} />
            Export
          </button>
          <button
            onClick={() => setIsWhatsAppOnboardingOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20 hover:scale-105 transition-all"
          >
            <MessageSquare size={18} />
            WhatsApp
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-sky-100 hover:scale-105 transition-all"
          >
            <UserPlus size={18} />
            Register Patient
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-[32px] border border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filters:</span>
        </div>
        
        <select 
          value={patientFilters.district}
          onChange={(e) => setPatientFilters({ district: e.target.value as any })}
          className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-sky-500 shadow-sm"
        >
          <option value="All">All Districts</option>
          {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={patientFilters.status}
          onChange={(e) => setPatientFilters({ status: e.target.value as any })}
          className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-sky-500 shadow-sm"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Discharged">Discharged (Recovered)</option>
          <option value="Deceased">Deceased</option>
          <option value="Cancelled">Contract Cancelled</option>
          <option value="Dissatisfied">Dissatisfied</option>
        </select>

        <button 
          onClick={() => setPatientFilters({ district: 'All', status: 'All' })}
          className="text-xs font-bold text-sky-600 hover:underline ml-auto px-4"
        >
          Clear All
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === 'grid' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredPatients.map(p => (
              <PatientCard
                key={p.id}
                patient={p}
                staff={staff}
                onClick={() => setSelectedPatient(p)}
                onEdit={() => {
                  setSelectedPatient(p);
                  setIsEditModalOpen(true);
                }}
                onUpdate={handleUpdatePatient}
                onMatch={(patient) => {
                  setMatchingPatient(patient);
                  setIsMatchingOpen(true);
                }}
                onEndServices={(patient) => {
                  setEndServicesPatient(patient);
                  setIsEndServicesOpen(true);
                }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Medical Condition</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">District</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Caregiver</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPatients.map(p => {
                  const assignedStaff = staff.find(s => s.id === p.assigned_staff_id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 font-bold text-sm">
                            {p.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{p.full_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{formatPKPhone(p.contact)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="text-xs font-medium text-slate-600">{p.medical_condition}</span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <MapPin size={12} className="text-slate-400" />
                          {p.district}
                        </div>
                      </td>
                      <td className="p-6">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="p-6">
                        {assignedStaff ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold">
                              {assignedStaff.full_name.charAt(0)}
                            </div>
                            <span className="text-xs font-medium text-slate-600">{assignedStaff.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-amber-600">Unassigned</span>
                        )}
                      </td>
                      <td className="p-6 text-right">
                        <button 
                          onClick={() => setSelectedPatient(p)}
                          className="p-2 text-slate-400 hover:text-sky-600 transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AddPatientForm 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddPatient}
      />

      <AddPatientForm 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onAdd={handleUpdatePatient}
        initialData={selectedPatient}
      />
      
      {/* Patient Profile Modal */}
      <AnimatePresence>
        {selectedPatient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPatient(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-sky-600 to-indigo-600 text-white">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[32px] bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-3xl border border-white/30">
                    {selectedPatient.full_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">{selectedPatient.full_name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sky-100 text-sm font-bold uppercase tracking-widest">{selectedPatient.district}</span>
                      <div className="w-1 h-1 bg-white/30 rounded-full" />
                      <span className="text-sky-100 text-sm font-medium">{selectedPatient.medical_condition}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setPatientToDelete(selectedPatient);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 bg-white/10 hover:bg-rose-500 rounded-xl transition-all text-white"
                    title="Delete Patient Record"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white"
                    title="Edit Patient Profile"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button onClick={() => setSelectedPatient(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* Left Column: Patient Info */}
                  <div className="lg:col-span-1 space-y-8">
                    <section className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <UserRound size={14} />
                        Patient Profile
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">CNIC</p>
                          <p className="text-sm font-bold text-slate-900">{formatCNIC(selectedPatient.cnic)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</p>
                          <p className="text-sm font-bold text-slate-900">
                            {selectedPatient.date_of_birth ? formatPKDate(selectedPatient.date_of_birth) : <span className="text-rose-500 italic font-bold">Missing Info</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Contact</p>
                          <p className="text-sm font-bold text-sky-600">{formatPKPhone(selectedPatient.contact)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Alt Contact / WhatsApp</p>
                          <p className="text-sm font-bold text-slate-900">
                            {selectedPatient.alt_contact ? formatPKPhone(selectedPatient.alt_contact) : <span className="text-rose-500 italic font-bold">Missing Info</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Admission</p>
                          <p className="text-sm font-bold text-slate-900">{formatPKDate(selectedPatient.admission_date)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                          <p className="text-xs font-medium text-slate-600 leading-relaxed">{selectedPatient.address}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Area / Town</p>
                          <p className="text-sm font-bold text-slate-900">
                            {selectedPatient.area || <span className="text-rose-500 italic font-bold">Missing Info</span>}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ShieldCheck size={14} />
                        Guardian
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{selectedPatient.guardian_relationship}</p>
                          <p className="text-sm font-bold text-slate-900">{selectedPatient.guardian_name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Contact</p>
                          <p className="text-sm font-bold text-sky-600">{formatPKPhone(selectedPatient.guardian_contact)}</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Middle Columns: Medical & Care Plan */}
                  <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                          <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                            <Heart size={20} />
                          </div>
                          Care Plan & Medical History
                        </h3>
                        <StatusBadge status={selectedPatient.status} />
                      </div>
                      
                      <div className="space-y-6 mb-8">
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Service Type</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedPatient.service_type || '—'}</p>
                          <div className="flex items-center gap-4 mt-4">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Frequency</p>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedPatient.frequency || '—'}</p>
                            </div>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-600" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Duration</p>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedPatient.duration || '—'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-6 bg-sky-50 dark:bg-sky-900/20 rounded-3xl border border-sky-100 dark:border-sky-800">
                          <p className="text-[10px] font-bold text-sky-400 uppercase mb-3">Assigned Staff (Today)</p>
                          <ShiftStaffDisplay
                            patient={selectedPatient}
                            allStaff={staff}
                            refreshKey={shiftAssignRefreshKey}
                            onUnassign={handleUnassignStaff}
                            onViewStaff={handleViewStaff}
                            onAssign={() => {
                              setShiftAssignPatient(selectedPatient);
                              setIsShiftAssignOpen(true);
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Clinical Notes</h4>
                          <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 leading-relaxed italic border-l-4 border-sky-500">
                            {selectedPatient.doctor_notes ? (
                              `"${selectedPatient.doctor_notes}"`
                            ) : (
                              <span className="text-rose-500 font-bold">Missing Clinical Notes</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Special Requirements</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedPatient.special_requirements ? (
                              selectedPatient.special_requirements.split(',').map(req => (
                                <span key={req} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full text-[10px] font-bold text-slate-600 shadow-sm">
                                  {req.trim()}
                                </span>
                              ))
                            ) : (
                              <span className="text-rose-500 text-[10px] font-bold uppercase italic">Missing Special Requirements</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                          <History size={20} />
                        </div>
                        Visit History
                      </h3>
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center justify-between p-4 border border-slate-50 rounded-2xl hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <CheckCircle2 size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">Routine Checkup Completed</p>
                                <p className="text-xs text-slate-500">March {20-i}, 2024 • 09:00 AM</p>
                              </div>
                            </div>
                            <button className="text-xs font-bold text-sky-600 hover:underline">View Report</button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Billing & Documents */}
                  <div className="lg:col-span-1 space-y-8">
                    <section className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <CreditCard size={14} />
                        Billing & Package
                      </h3>
                      <div className="space-y-6">
                        <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                          <p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">{selectedPatient.billing_package} Package</p>
                          <p className="text-2xl font-black">{formatPKR(selectedPatient.billing_rate)}</p>
                          <p className="text-[10px] text-indigo-100 mt-2">Due on 1st of every month</p>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-400">Payment Method</span>
                            <span className="text-slate-900">{selectedPatient.payment_method}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-400">Last Payment</span>
                            <span className="text-emerald-600">Mar 02, 2024</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setAdvancePatient(selectedPatient);
                            setAdvanceAmount('');
                            setAdvanceMethod('Cash');
                            setAdvanceReason('');
                            setAdvanceNotes('');
                            setAdvanceDate(getKarachiToday());
                            setIsAdvanceModalOpen(true);
                          }}
                          className="w-full py-3 bg-red-600 text-white rounded-2xl text-xs font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-100 dark:shadow-red-900/20"
                        >
                          <ReceiptText size={16} />
                          Record Advance & Generate Invoice
                        </button>
                      </div>
                    </section>

                    <section className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sparkles size={14} className="text-sky-500" />
                        AI Medical Assistant
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100">
                          <p className="text-[10px] font-bold text-sky-600 uppercase mb-2">Analyze Report/Image</p>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-sky-200 rounded-2xl cursor-pointer hover:bg-sky-100/50 transition-all">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Plus size={20} className="text-sky-400 mb-2" />
                              <p className="text-[10px] font-bold text-sky-500">Click to upload & analyze</p>
                            </div>
                            <input type="file" className="hidden" onChange={handleAnalyzeImage} accept="image/*" />
                          </label>
                        </div>

                        {isAnalyzing && (
                          <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                            <Loader2 size={16} className="animate-spin text-sky-600" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Gemini is analyzing...</span>
                          </div>
                        )}

                        {analysisResult && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm max-h-[300px] overflow-y-auto custom-scrollbar"
                          >
                            <div className="prose prose-sm max-w-none prose-slate">
                              <ReactMarkdown>{analysisResult}</ReactMarkdown>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPatientToDelete(null);
        }}
        onConfirm={handleDeletePatient}
        title="Delete Patient Record"
        message={`Are you sure you want to delete ${patientToDelete?.full_name}? This action cannot be undone and all associated data will be permanently removed.`}
        confirmText="Delete Record"
        type="danger"
      />

      {/* Staff Matching Modal */}
      {matchingPatient && (
        <StaffMatchingModal
          isOpen={isMatchingOpen}
          onClose={() => {
            setIsMatchingOpen(false);
            setMatchingPatient(null);
          }}
          patient={matchingPatient}
          allStaff={staff}
          onAssign={(staffId) => {
            if (matchingPatient) {
              handleUpdatePatient({ assigned_staff_id: staffId });
            }
          }}
        />
      )}

      {/* Shift Assignment Modal (for "Assign Now" button) */}
      {shiftAssignPatient && (
        <ShiftAssignmentModal
          isOpen={isShiftAssignOpen}
          onClose={() => {
            setIsShiftAssignOpen(false);
            setShiftAssignPatient(null);
          }}
          patient={shiftAssignPatient}
          allStaff={staff}
          onAssigned={() => {
            // Refresh patient list and shift staff display
            refetch();
            setShiftAssignRefreshKey(k => k + 1);
            // Invalidate dashboard stats
            queryClient.invalidateQueries({ queryKey: ['on-duty-count'] });
          }}
        />
      )}

      {/* End Services Modal */}
      {endServicesPatient && (
        <EndServicesModal
          isOpen={isEndServicesOpen}
          onClose={() => {
            setIsEndServicesOpen(false);
            setEndServicesPatient(null);
          }}
          patient={endServicesPatient}
          onEnd={handleEndServices}
        />
      )}

      {/* WhatsApp Onboarding Modal */}
      <WhatsAppOnboardingModal
        isOpen={isWhatsAppOnboardingOpen}
        onClose={() => setIsWhatsAppOnboardingOpen(false)}
        onPatientCreated={(patient) => {
          setPatients([patient, ...patients]);
          setIsWhatsAppOnboardingOpen(false);
        }}
      />

      {/* Patient Advance & Invoice Modal */}
      <AnimatePresence>
        {isAdvanceModalOpen && advancePatient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setIsAdvanceModalOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-slate-900 px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-600">
                      <Receipt size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">Record Advance Payment</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Generate invoice for client advance</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAdvanceModalOpen(false)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Patient summary card */}
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                      {advancePatient.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{advancePatient.full_name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        ID: {advancePatient.patient_id_assigned || advancePatient.id.substring(0, 8).toUpperCase()} • {advancePatient.district}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-5">
                {/* Amount */}
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                    Advance Amount (PKR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                    <input
                      type="number"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="25,000"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:text-white"
                      min="1"
                      step="1"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                    Payment Method
                  </label>
                  <select
                    value={advanceMethod}
                    onChange={(e) => setAdvanceMethod(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 dark:text-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 dark:text-white"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                    Reason for Advance
                  </label>
                  <input
                    type="text"
                    value={advanceReason}
                    onChange={(e) => setAdvanceReason(e.target.value)}
                    placeholder="e.g., Monthly service package"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 dark:text-white"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={advanceNotes}
                    onChange={(e) => setAdvanceNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 dark:text-white resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!advanceAmount || isGeneratingInvoice}
                  onClick={async () => {
                    if (!advancePatient || !advanceAmount) return;
                    setIsGeneratingInvoice(true);
                    try {
                      // 1. Create advance record
                      const newAdvance = await patientAdvancesService.create({
                        patient_id: advancePatient.id,
                        amount: parseFloat(advanceAmount),
                        advance_date: advanceDate,
                        payment_method: advanceMethod as PatientAdvance['payment_method'],
                        reason: advanceReason,
                        notes: advanceNotes,
                        status: 'received',
                        invoice_number: '',
                        invoice_generated: false,
                        created_by: 'test-admin@hmsp.local',
                      });

                      // 2. Generate and download PDF invoice
                      await generateAdvanceInvoice({
                        patient: advancePatient,
                        advance: newAdvance,
                      });

                      // 3. Mark invoice as generated
                      await patientAdvancesService.markInvoiceGenerated(newAdvance.id);

                      toast.success(`Invoice ${newAdvance.invoice_number} generated & downloaded`);
                      setIsAdvanceModalOpen(false);
                      
                      // Invalidate dashboard stats
                      queryClient.invalidateQueries({ queryKey: ['advances-recent'] });
                    } catch (error) {
                      console.error('Advance creation error:', error);
                      toast.error('Failed to generate invoice. Check console for details.');
                    } finally {
                      setIsGeneratingInvoice(false);
                    }
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-2xl text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-red-100 dark:shadow-red-900/20"
                >
                  {isGeneratingInvoice ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ReceiptText size={14} />
                      Save & Download Invoice
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staff Quick View Modal (from assigned staff click) */}
      <StaffQuickView
        staff={viewingStaff}
        onClose={() => setViewingStaff(null)}
        onSave={() => setShiftAssignRefreshKey(k => k + 1)}
      />
    </div>
  );
};
