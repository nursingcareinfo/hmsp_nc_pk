import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Repeat
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUIStore } from '../store';
import { dataService } from '../dataService';
import { Patient, District, PatientStatus, Staff } from '../types';
import { format } from 'date-fns';
import { formatPKR, formatPKDate, formatCNIC, formatPKPhone } from '../lib/utils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { geminiService } from '../services/geminiService';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ConfirmationModal } from './ConfirmationModal';
import { CameraCapture } from './CameraCapture';
import { StaffMatchingModal } from './StaffMatchingModal';
import { WhatsAppOnboardingModal } from './WhatsAppOnboardingModal';
import { matchStaffToPatient, MatchResult } from '../services/matchingService';

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
  contact: z.string().regex(/^\+92 3\d{2} \d{7}$/, 'Invalid phone format (+92 3XX XXXXXXX)'),
  alt_contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  address: z.string().min(10, 'Address is too short'),
  area: z.string().optional(),
  city: z.string().optional(),
  district: z.string(),
  status: z.string(),
  admission_date: z.string(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['Male', 'Female']),
  blood_group: z.string().optional(),
  marital_status: z.string().optional(),
  guardian_name: z.string().min(3, 'Guardian name is required'),
  guardian_contact: z.string().regex(/^\+92 3\d{2} \d{7}$/, 'Invalid phone format (+92 3XX XXXXXXX)'),
  guardian_cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'Invalid CNIC format (XXXXX-XXXXXXX-X)'),
  guardian_relationship: z.string(),
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
  service_type: z.string(),
  frequency: z.string(),
  duration: z.string(),
  billing_package: z.string(),
  billing_rate: z.number().min(0),
  payment_method: z.string(),
  advance_payment_received: z.boolean().default(false),
  advance_payment_date: z.string().optional(),
  cnic_image_urls: z.array(z.string()).optional(),
  form_image_urls: z.array(z.string()).optional(),
});

// --- Components ---

const StatusBadge = ({ status }: { status: PatientStatus }) => {
  const colors = {
    Active: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Discharged: "bg-slate-50 text-slate-600 border-slate-100",
    Pending: "bg-amber-50 text-amber-600 border-amber-100"
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

const PatientCard = ({ patient, staff, onClick, onEdit, onUpdate, onMatch }: { patient: Patient, staff: Staff[], onClick: () => void, onEdit: () => void, onUpdate: (id: string, data: any) => Promise<void>, onMatch: (patient: Patient) => void }) => {
  const assignedStaff = staff.find(s => s.id === patient.assigned_staff_id);
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState({
    full_name: patient.full_name,
    status: patient.status,
    billing_rate: patient.billing_rate
  });
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = 
    editBuffer.full_name !== patient.full_name || 
    editBuffer.status !== patient.status || 
    editBuffer.billing_rate !== patient.billing_rate;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
                <option value="Discharged">Discharged</option>
              </select>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400">Rs.</span>
                <input 
                  type="number"
                  value={editBuffer.billing_rate}
                  onChange={(e) => setEditBuffer(prev => ({ ...prev, billing_rate: Number(e.target.value) }))}
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
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Assigned Caregiver</p>
            {assignedStaff ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                    {assignedStaff.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{assignedStaff.full_name}</p>
                    <p className="text-[10px] text-slate-500">{assignedStaff.designation}</p>
                  </div>
                </div>

                {/* Shift Schedule */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <Sun size={12} className="text-teal-600 dark:text-teal-400" />
                    <div>
                      <p className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase">Day</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400">
                        {['Day', 'Both', '24 hrs'].includes(assignedStaff.shift_preference as string) || !assignedStaff.shift_preference ? '✓ Available' : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <Moon size={12} className="text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Night</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400">
                        {['Night', 'Both', '24 hrs'].includes(assignedStaff.shift_preference as string) ? '✓ Available' : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Service type badge */}
                {patient.service_type && (
                  <span className="inline-block mt-3 px-2 py-0.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-md text-[9px] font-black uppercase tracking-tighter border border-sky-100 dark:border-sky-800">
                    {patient.service_type}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle size={14} />
                  <span className="text-xs font-bold">Unassigned</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMatch(patient);
                  }}
                  className="w-full py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                >
                  <UserCheck size={14} />
                  Find Best Match
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); window.open(`tel:${patient.contact}`); }}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-sky-50 hover:text-sky-600 transition-all"
            >
              <Phone size={14} />
              Call
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${patient.contact.replace(/\s+/g, '')}`); }}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all"
            >
              <MessageSquare size={14} />
              WhatsApp
            </button>
          </div>
        </>
      )}
    </motion.div>
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
      admission_date: new Date().toISOString().split('T')[0],
      billing_rate: 0,
      payment_method: 'Cash',
      advance_payment_received: false,
      advance_payment_date: new Date().toISOString().split('T')[0],
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
          admission_date: new Date().toISOString().split('T')[0],
          billing_rate: 0,
          payment_method: 'Cash',
          advance_payment_received: false,
          advance_payment_date: new Date().toISOString().split('T')[0],
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
        className="relative bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-sky-600 text-white">
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
                        <div key={idx} className="relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden shrink-0 group">
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
                        <div key={idx} className="relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden shrink-0 group">
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
                  <input {...register('cnic')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.cnic && "ring-2 ring-rose-500 bg-rose-50")} placeholder="XXXXX-XXXXXXX-X" />
                  {errors.cnic && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.cnic.message as string}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Number *</label>
                  <input {...register('contact')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.contact && "ring-2 ring-rose-500 bg-rose-50")} placeholder="+92 3XX XXXXXXX" />
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
                  <input {...register('guardian_contact')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.guardian_contact && "ring-2 ring-rose-500 bg-rose-50")} />
                  {errors.guardian_contact && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2">{errors.guardian_contact.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Guardian CNIC *</label>
                  <input {...register('guardian_cnic')} className={cn("w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500", errors.guardian_cnic && "ring-2 ring-rose-500 bg-rose-50")} />
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
            </section>

            {/* Billing */}
            <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={14} />
                Billing Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
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
                    <label className="text-sm font-bold text-slate-900 block">Advance Payment Received</label>
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

        <div className="p-8 border-t border-slate-100 flex justify-between bg-slate-50">
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
            Register Patient
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
  
  // Staff matching modal state
  const [isMatchingOpen, setIsMatchingOpen] = useState(false);
  const [matchingPatient, setMatchingPatient] = useState<Patient | null>(null);
  
  // WhatsApp onboarding modal state
  const [isWhatsAppOnboardingOpen, setIsWhatsAppOnboardingOpen] = useState(false);

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
  const { data: queryPatients = [], isLoading: isPatientLoading } = useQuery({
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
        admission_date: data.admission_date || new Date().toISOString().split('T')[0],
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
          className="bg-white border-slate-100 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-sky-500 shadow-sm"
        >
          <option value="All">All Districts</option>
          {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select 
          value={patientFilters.status}
          onChange={(e) => setPatientFilters({ status: e.target.value as any })}
          className="bg-white border-slate-100 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-sky-500 shadow-sm"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Discharged">Discharged</option>
          <option value="Pending">Pending</option>
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
              />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden"
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
              className="relative bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-sky-600 to-indigo-600 text-white">
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
                    <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
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

                    <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
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
                    <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                          <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                            <Heart size={20} />
                          </div>
                          Care Plan & Medical History
                        </h3>
                        <StatusBadge status={selectedPatient.status} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Service Type</p>
                          <p className="text-sm font-bold text-slate-900">{selectedPatient.service_type}</p>
                          <div className="flex items-center gap-4 mt-4">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Frequency</p>
                              <p className="text-xs font-bold text-slate-700">{selectedPatient.frequency}</p>
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Duration</p>
                              <p className="text-xs font-bold text-slate-700">{selectedPatient.duration}</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-6 bg-sky-50 rounded-3xl border border-sky-100">
                          <p className="text-[10px] font-bold text-sky-400 uppercase mb-2">Assigned Staff</p>
                          {staff.find(s => s.id === selectedPatient.assigned_staff_id) ? (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold">
                                {staff.find(s => s.id === selectedPatient.assigned_staff_id)?.full_name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-sky-900">{staff.find(s => s.id === selectedPatient.assigned_staff_id)?.full_name}</p>
                                <p className="text-[10px] text-sky-600 font-bold">{staff.find(s => s.id === selectedPatient.assigned_staff_id)?.designation}</p>
                              </div>
                            </div>
                          ) : (
                            <button className="w-full py-2 bg-white text-sky-600 rounded-xl text-xs font-bold border border-sky-200 hover:bg-sky-100 transition-all">
                              Assign Now
                            </button>
                          )}
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
                                <span key={req} className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-bold text-slate-600 shadow-sm">
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

                    <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
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
                    <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
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
                        <button className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all">
                          Generate Invoice
                        </button>
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
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
                          <div className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <Loader2 size={16} className="animate-spin text-sky-600" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Gemini is analyzing...</span>
                          </div>
                        )}

                        {analysisResult && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm max-h-[300px] overflow-y-auto custom-scrollbar"
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

      {/* WhatsApp Onboarding Modal */}
      <WhatsAppOnboardingModal
        isOpen={isWhatsAppOnboardingOpen}
        onClose={() => setIsWhatsAppOnboardingOpen(false)}
        onPatientCreated={(patient) => {
          setPatients([patient, ...patients]);
          setIsWhatsAppOnboardingOpen(false);
        }}
      />
    </div>
  );
};
