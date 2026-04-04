import React, { useState, useMemo } from 'react';
import { 
  Users, 
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
  UserRound,
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
  Camera,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUIStore } from '../store';
import { dataService } from '../dataService';
import { Staff, District, Designation, StaffStatus, StaffCategory } from '../types';
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
  'Keamari',
  'Gulshan-e-Iqbal'
];

const CATEGORIES: StaffCategory[] = [
  'Management',
  'Nurses',
  'Midwives',
  'Attendants',
  'Doctors',
  'Technical',
  'Other'
];

const CATEGORY_DESIGNATIONS: Record<StaffCategory, Designation[]> = {
  'Management': [
    'CEO & Managing Director',
    'Office Coordinator & HR Manager',
    'Manager',
    'Office Boy',
    'CEO/Admin',
    'IT AI Expert',
    'Office Co-ordinator'
  ],
  'Nurses': [
    'Registered Nurse (R/N)',
    'BSN Nurse',
    'Staff Nurse',
    'Nursing Staff',
    'R.N.R.M',
    'Aid Nurse',
    'Nurse Aid'
  ],
  'Midwives': [
    'Mid Wife',
    'Community Midwife'
  ],
  'Attendants': [
    'Nurse Assistant',
    'Attendant',
    'Baby Sitter',
    'NGA',
    'HCA'
  ],
  'Doctors': [
    'Doctor',
    'Physiotherapist',
    'Medical'
  ],
  'Technical': [
    'Technician',
    'EMT Tech',
    'ICU technician',
    'CCT + O.T. Tech'
  ],
  'Other': [
    'Other'
  ]
};

const DESIGNATIONS: Designation[] = Object.values(CATEGORY_DESIGNATIONS).flat() as Designation[];

// --- Form Schema ---

const staffSchema = z.object({
  full_name: z.string().min(3, 'Full name is required'),
  father_husband_name: z.string().optional(),
  date_of_birth: z.string().optional(),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'Invalid CNIC format (XXXXX-XXXXXXX-X)'),
  contact_1: z.string().regex(/^\+92 3\d{2} \d{7}$/, 'Invalid phone format (+92 3XX XXXXXXX)'),
  alt_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  category: z.enum(['Management', 'Nurses', 'Midwives', 'Attendants', 'Doctors', 'Technical', 'Other']),
  designation: z.string(),
  gender: z.enum(['Male', 'Female']),
  religion: z.string(),
  marital_status: z.string(),
  official_district: z.string(),
  residential_area: z.string(),
  area_town: z.string().optional(),
  city: z.string().optional(),
  address: z.string(),
  qualification: z.string(),
  experience_years: z.number().min(0),
  relevant_experience: z.string().optional(),
  shift_preference: z.enum(['Day', 'Night', '24 hrs']).optional(),
  expected_salary: z.number().min(0).optional(),
  availability: z.enum(['Immediate', '2 Weeks', '1 Month']).optional(),
  preferred_payment: z.string().optional(),
  bank_name: z.string().optional(),
  account_title: z.string().optional(),
  account_number: z.string().optional(),
  iban: z.string().optional(),
  salary: z.number().min(0),
  shift_rate: z.number().min(0),
  hire_date: z.string(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_alt_phone: z.string().optional(),
  cnic_image_urls: z.array(z.string()).optional(),
  form_image_urls: z.array(z.string()).optional(),
});

// --- Components ---

const StatusBadge = ({ status }: { status: StaffStatus }) => {
  const colors = {
    Active: "bg-emerald-50 text-emerald-600 border-emerald-100",
    "On Leave": "bg-amber-50 text-amber-600 border-amber-100",
    Inactive: "bg-slate-50 text-slate-600 border-slate-100"
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

const StaffCard = ({ staff, onClick }: { staff: Staff, onClick: () => void }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ y: -5 }}
    onClick={onClick}
    className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
      <button 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="p-2 hover:bg-teal-50 rounded-xl text-slate-400 hover:text-teal-600 transition-colors"
        title="Edit Staff"
      >
        <Edit2 size={16} />
      </button>
      <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-teal-600 transition-colors">
        <MoreVertical size={16} />
      </button>
    </div>

    <div className="flex items-center gap-4 mb-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 flex items-center justify-center text-teal-600 font-black text-2xl shadow-inner border border-white">
        {staff.full_name.charAt(0)}
      </div>
      <div>
        <h4 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{staff.full_name}</h4>
        <p className="text-xs text-slate-500 font-medium">{staff.category || 'Other'} • {staff.designation}</p>
        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-bold uppercase">
          <MapPin size={10} />
          {staff.official_district}
        </div>
      </div>
    </div>

    <div className="flex items-center justify-between mb-6">
      <div className="flex flex-col gap-1.5">
        <StatusBadge status={staff.status} />
        <span className="px-2 py-0.5 bg-teal-50 text-teal-600 rounded-md text-[9px] font-black uppercase tracking-tighter border border-teal-100 w-fit">
          {formatPKR(staff.shift_rate)}/Shift
        </span>
      </div>
      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
        <Clock size={10} />
        Joined {formatPKDate(staff.hire_date)}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <button 
        onClick={(e) => { e.stopPropagation(); window.open(`tel:${staff.contact_1}`); }}
        className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-teal-50 hover:text-teal-600 transition-all"
      >
        <Phone size={14} />
        Call
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${staff.contact_1.replace(/\s+/g, '')}`); }}
        className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all"
      >
        <MessageSquare size={14} />
        WhatsApp
      </button>
    </div>
  </motion.div>
);

const AddStaffWizard = ({ isOpen, onClose, onAdd, initialData }: any) => {
  const [step, setStep] = useState(1);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraType, setCameraType] = useState<'cnic' | 'form'>('cnic');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [skipAI, setSkipAI] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: initialData || {
      gender: 'Female',
      category: 'Nurses',
      designation: 'Registered Nurse (R/N)',
      official_district: 'Karachi South',
      hire_date: new Date().toISOString().split('T')[0],
      experience_years: 0,
      salary: 0,
      shift_rate: 0
    }
  });

  const selectedCategory = watch('category');

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset(initialData);
      } else {
        reset({
          gender: 'Female',
          category: 'Nurses',
          designation: 'Registered Nurse (R/N)',
          official_district: 'Karachi South',
          hire_date: new Date().toISOString().split('T')[0],
          experience_years: 0,
          salary: 0,
          shift_rate: 0
        });
      }
      setStep(1);
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
      const extractedData = await geminiService.extractDataFromImage(base64, 'staff');
      
      if (extractedData) {
        if (extractedData.full_name) setValue('full_name', extractedData.full_name);
        if (extractedData.cnic) setValue('cnic', extractedData.cnic);
        if (extractedData.contact_1) setValue('contact_1', extractedData.contact_1);
        if (extractedData.category && CATEGORIES.includes(extractedData.category as StaffCategory)) {
          setValue('category', extractedData.category as StaffCategory);
        }
        if (extractedData.designation) setValue('designation', extractedData.designation);
        if (extractedData.address) setValue('address', extractedData.address);
        if (extractedData.qualification) setValue('qualification', extractedData.qualification);
        if (extractedData.experience_years) setValue('experience_years', Number(extractedData.experience_years));
        
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
    setStep(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-teal-600 text-white">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{initialData ? 'Edit Staff Profile' : 'New Staff Registration'}</h2>
            <p className="text-teal-100 text-sm font-medium">Step {step} of 3: {step === 1 ? 'Personal Info' : step === 2 ? 'Professional Details' : 'Employment Terms'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form id="add-staff-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="flex gap-4 mb-6">
                  <button 
                    type="button"
                    onClick={() => { setCameraType('cnic'); setIsBatchMode(false); setSkipAI(false); setIsCameraOpen(true); }}
                    className="flex-1 flex flex-col items-center justify-center p-4 bg-teal-50 border-2 border-dashed border-teal-200 rounded-3xl hover:bg-teal-100 transition-all group"
                  >
                    <Camera size={24} className="text-teal-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Scan CNIC</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setCameraType('form'); setIsBatchMode(false); setSkipAI(false); setIsCameraOpen(true); }}
                    className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl hover:bg-slate-100 transition-all group"
                  >
                    <FileText size={24} className="text-slate-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Scan Form</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                    <input {...register('full_name')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Father/Husband Name</label>
                    <input {...register('father_husband_name')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                    <input type="date" {...register('date_of_birth')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gender *</label>
                    <select {...register('gender')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500">
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Religion</label>
                    <select {...register('religion')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500">
                      <option>Muslim</option>
                      <option>Christian</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CNIC Number *</label>
                    <input {...register('cnic')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" placeholder="XXXXX-XXXXXXX-X" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marital Status</label>
                    <select {...register('marital_status')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500">
                      <option>Single</option>
                      <option>Married</option>
                      <option>Divorced</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number *</label>
                    <input {...register('contact_1')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" placeholder="+92 3XX XXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp</label>
                    <input {...register('whatsapp')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Complete Address *</label>
                  <textarea {...register('address')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 min-h-[80px]" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Area/Town</label>
                    <input {...register('area_town')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">City</label>
                    <input {...register('city')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" defaultValue="Karachi" />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category *</label>
                    <select 
                      {...register('category')} 
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500"
                      onChange={(e) => {
                        const cat = e.target.value as StaffCategory;
                        setValue('category', cat);
                        // Set default designation for the category
                        if (CATEGORY_DESIGNATIONS[cat]) {
                          setValue('designation', CATEGORY_DESIGNATIONS[cat][0]);
                        }
                      }}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Designation *</label>
                    <select {...register('designation')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500">
                      {(CATEGORY_DESIGNATIONS[selectedCategory as StaffCategory] || []).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Official District *</label>
                    <select {...register('official_district')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500">
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Experience (Years)</label>
                    <input type="number" {...register('experience_years', { valueAsNumber: true })} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shift Preference</label>
                    <select {...register('shift_preference')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500">
                      <option value="Day">Day</option>
                      <option value="Night">Night</option>
                      <option value="24 hrs">24 hrs</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Availability</label>
                    <select {...register('availability')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500">
                      <option value="Immediate">Immediate</option>
                      <option value="2 Weeks">2 Weeks</option>
                      <option value="1 Month">1 Month</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expected Salary (PKR)</label>
                    <input type="number" {...register('expected_salary', { valueAsNumber: true })} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Qualification *</label>
                    <input {...register('qualification')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" placeholder="e.g. BSN Nursing" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Relevant Experience Details</label>
                  <textarea {...register('relevant_experience')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 min-h-[80px]" />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred Payment Method</label>
                    <select {...register('preferred_payment')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500">
                      <option>Cash</option>
                      <option>Mobile Transfer</option>
                      <option>JazzCash</option>
                      <option>EasyPesa</option>
                      <option>Bank</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Name</label>
                    <input {...register('bank_name')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Title</label>
                    <input {...register('account_title')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Number / IBAN</label>
                    <input {...register('account_number')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={14} />
                    Emergency Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Name</label>
                      <input {...register('emergency_contact_name')} className="w-full bg-white border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Relationship</label>
                      <input {...register('emergency_contact_relationship')} className="w-full bg-white border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Phone</label>
                      <input {...register('emergency_contact_phone')} className="w-full bg-white border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Alt Phone</label>
                      <input {...register('emergency_contact_alt_phone')} className="w-full bg-white border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hire Date *</label>
                    <input type="date" {...register('hire_date')} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Salary (PKR) *</label>
                    <input type="number" {...register('salary', { valueAsNumber: true })} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shift Rate *</label>
                    <input type="number" {...register('shift_rate', { valueAsNumber: true })} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </motion.div>
            )}
          </form>
        </div>

        <div className="p-8 border-t border-slate-100 flex justify-between bg-slate-50">
          <button 
            type="button"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button 
            type="button"
            onClick={() => step < 3 ? setStep(step + 1) : document.getElementById('add-staff-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            className="px-8 py-3 bg-teal-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-teal-200 hover:scale-105 transition-all"
          >
            {step === 3 ? (initialData ? 'Update Profile' : 'Complete Registration') : 'Next Step'}
          </button>
        </div>
      </motion.div>

      {isCameraOpen && (
        <CameraCapture 
          title={cameraType === 'cnic' ? (isBatchMode ? "Batch Scan CNIC" : "Scan Staff CNIC") : "Scan Staff Form"}
          multiple={isBatchMode}
          onCapture={handleCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
};

// --- Module ---

export const StaffModule = () => {
  const { searchQuery, staffFilters, setStaffFilters } = useUIStore();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'salary'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddingAdvance, setIsAddingAdvance] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ amount: 0, reason: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  React.useEffect(() => {
    setAnalysisResult(null);
  }, [selectedStaff]);

  const handleAnalyzeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await geminiService.analyzeImage(base64, "Analyze this staff document (CNIC, Degree, or Certification) and verify the details. Provide a summary of the document and any potential issues.");
        setAnalysisResult(result);
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to analyze document");
      setIsAnalyzing(false);
    }
  };

  React.useEffect(() => {
    dataService.getStaff().then(setStaff);
  }, []);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.assigned_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           s.cnic.includes(searchQuery);
      
      const matchesCategory = staffFilters.category === 'All' || (s.category || 'Other') === staffFilters.category;
      const matchesDesignation = staffFilters.designation === 'All' || s.designation === staffFilters.designation;
      const matchesDistrict = staffFilters.district === 'All' || s.official_district === staffFilters.district;
      const matchesStatus = staffFilters.status === 'All' || s.status === staffFilters.status;
      
      return matchesSearch && matchesCategory && matchesDesignation && matchesDistrict && matchesStatus;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.full_name.localeCompare(b.full_name);
      if (sortBy === 'date') comparison = new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime();
      if (sortBy === 'salary') comparison = a.salary - b.salary;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [staff, searchQuery, staffFilters, sortBy, sortOrder]);

  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, currentPage]);

  const totalPages = Math.ceil(filteredStaff.length / pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, staffFilters]);

  const handleAddStaff = async (data: any) => {
    const newStaff = await dataService.addStaff({
      ...data,
      status: 'Active',
      religion: 'Islam',
      marital_status: 'Single',
      address: data.residential_area,
    });
    setStaff([newStaff, ...staff]);
    toast.success('Staff member registered successfully!');
  };

  const handleUpdateStaff = async (data: any) => {
    if (!selectedStaff) return;
    const updatedStaff = await dataService.updateStaff(selectedStaff.id, data);
    setStaff(staff.map(s => s.id === selectedStaff.id ? updatedStaff : s));
    setSelectedStaff(updatedStaff);
    setIsEditModalOpen(false);
    toast.success('Staff profile updated successfully!');
  };

  const handleAddAdvance = async () => {
    if (!selectedStaff || advanceForm.amount <= 0) return;

    try {
      const newAdvance = {
        id: Math.random().toString(36).substring(7),
        staff_id: selectedStaff.id,
        amount: advanceForm.amount,
        date: advanceForm.date,
        reason: advanceForm.reason,
        status: 'Approved' as const
      };

      const updatedAdvances = [...(selectedStaff.advances || []), newAdvance];
      const updated = await dataService.updateStaff(selectedStaff.id, { advances: updatedAdvances });
      
      setStaff(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSelectedStaff(updated);
      setIsAddingAdvance(false);
      setAdvanceForm({ amount: 0, reason: '', date: format(new Date(), 'yyyy-MM-dd') });
      toast.success('Advance payment recorded successfully');
    } catch (error) {
      toast.error('Failed to record advance payment');
    }
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    
    try {
      await dataService.deleteStaff(staffToDelete.id);
      setStaff(staff.filter(s => s.id !== staffToDelete.id));
      toast.success('Staff record deleted successfully');
      setStaffToDelete(null);
      setSelectedStaff(null);
    } catch (error) {
      toast.error('Failed to delete staff record');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Staff Directory</h2>
          <p className="text-slate-500 font-medium">Manage {staff.length} healthcare professionals across Karachi.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            <button 
              onClick={() => setView('grid')}
              className={cn("p-2 rounded-xl transition-all", view === 'grid' ? "bg-teal-600 text-white shadow-md" : "text-slate-400 hover:text-teal-600")}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn("p-2 rounded-xl transition-all", view === 'list' ? "bg-teal-600 text-white shadow-md" : "text-slate-400 hover:text-teal-600")}
            >
              <List size={20} />
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 hover:border-teal-600 hover:text-teal-600 transition-all shadow-sm">
            <Download size={18} />
            Export
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-teal-100 hover:scale-105 transition-all"
          >
            <UserPlus size={18} />
            Add Staff
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/50 backdrop-blur-md p-4 rounded-[32px] border border-slate-100 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filters:</span>
        </div>
        
        <select 
          value={staffFilters.category}
          onChange={(e) => setStaffFilters({ category: e.target.value as any, designation: 'All' })}
          className="bg-white border-slate-100 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-teal-500 shadow-sm outline-none"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select 
          value={staffFilters.designation}
          onChange={(e) => setStaffFilters({ designation: e.target.value as any })}
          className="bg-white border-slate-100 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-teal-500 shadow-sm outline-none"
        >
          <option value="All">All Designations</option>
          {staffFilters.category === 'All' 
            ? DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)
            : (CATEGORY_DESIGNATIONS[staffFilters.category as StaffCategory] || []).map(d => <option key={d} value={d}>{d}</option>)
          }
        </select>

        <select 
          value={staffFilters.district}
          onChange={(e) => setStaffFilters({ district: e.target.value as any })}
          className="bg-white border-slate-100 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-teal-500 shadow-sm"
        >
          <option value="All">All Districts</option>
          {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select 
          value={staffFilters.status}
          onChange={(e) => setStaffFilters({ status: e.target.value as any })}
          className="bg-white border-slate-100 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-teal-500 shadow-sm"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Inactive">Inactive</option>
        </select>

        <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />

        <div className="flex items-center gap-2">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border-slate-100 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-teal-500 shadow-sm"
          >
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Date</option>
            <option value="salary">Sort by Salary</option>
          </select>
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-teal-600 transition-all shadow-sm"
          >
            <ArrowUpDown size={16} className={cn(sortOrder === 'desc' && "rotate-180 transition-transform")} />
          </button>
        </div>

        <button 
          onClick={() => setStaffFilters({ designation: 'All', district: 'All', status: 'All' })}
          className="text-xs font-bold text-teal-600 hover:underline ml-auto px-4"
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
            {paginatedStaff.map(s => (
              <StaffCard key={s.id} staff={s} onClick={() => setSelectedStaff(s)} />
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
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Member</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">District</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedStaff.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-sm">
                          {s.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{s.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{s.assigned_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">{s.category || 'Other'}</span>
                    </td>
                    <td className="p-6">
                      <span className="text-xs font-medium text-slate-600">{s.designation}</span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <MapPin size={12} className="text-slate-400" />
                        {s.official_district}
                      </div>
                    </td>
                    <td className="p-6">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-lg transition-colors">
                          <PhoneCall size={16} />
                        </button>
                        <button className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors">
                          <MessageSquare size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedStaff(s)}
                          className="p-2 text-slate-400 hover:text-teal-600 transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedStaff(s);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-sky-600 transition-colors"
                          title="Edit Staff"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl bg-white border border-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-sm font-bold transition-all",
                    currentPage === pageNum 
                      ? "bg-teal-600 text-white shadow-lg shadow-teal-100" 
                      : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl bg-white border border-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
          >
            <ChevronRight size={20} />
          </button>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-4">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

      {/* Modals */}
      <AddStaffWizard 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddStaff}
      />

      <AddStaffWizard 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onAdd={handleUpdateStaff}
        initialData={selectedStaff}
      />
      
      {/* Staff Details Modal */}
      <AnimatePresence>
        {selectedStaff && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStaff(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-teal-600 to-sky-600 text-white">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[32px] bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-3xl border border-white/30">
                    {selectedStaff.full_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">{selectedStaff.full_name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-teal-100 text-sm font-bold uppercase tracking-widest">{selectedStaff.assigned_id}</span>
                      <div className="w-1 h-1 bg-white/30 rounded-full" />
                      <span className="text-teal-100 text-sm font-medium">{selectedStaff.category || 'Other'} • {selectedStaff.designation}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedStaff(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="absolute top-8 right-20 flex gap-2">
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white"
                  title="Edit Staff Profile"
                >
                  <Edit2 size={20} />
                </button>
                <button 
                  onClick={() => {
                    setStaffToDelete(selectedStaff);
                    setIsDeleteModalOpen(true);
                  }}
                  className="p-2 bg-white/10 hover:bg-rose-500 rounded-xl transition-all text-white"
                  title="Delete Staff Record"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Left Column: Personal & Contact */}
                  <div className="space-y-8">
                    <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <UserRound size={14} />
                        Personal Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">CNIC Number</p>
                          <p className="text-sm font-bold text-slate-900">{formatCNIC(selectedStaff.cnic)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Gender / Religion</p>
                          <p className="text-sm font-bold text-slate-900">{selectedStaff.gender} • {selectedStaff.religion}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Marital Status</p>
                          <p className="text-sm font-bold text-slate-900">{selectedStaff.marital_status}</p>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <PhoneCall size={14} />
                        Contact Details
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Primary (WhatsApp)</p>
                          <p className="text-sm font-bold text-teal-600">{formatPKPhone(selectedStaff.contact_1)}</p>
                        </div>
                        {selectedStaff.contact_2 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Secondary</p>
                            <p className="text-sm font-bold text-slate-900">{formatPKPhone(selectedStaff.contact_2)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Residential Area</p>
                          <p className="text-sm font-bold text-slate-900">{selectedStaff.residential_area}</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Middle Column: Professional */}
                  <div className="space-y-8">
                    <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Briefcase size={14} />
                        Professional Profile
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Qualification</p>
                          <p className="text-sm font-bold text-slate-900">{selectedStaff.qualification}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Experience</p>
                          <p className="text-sm font-bold text-slate-900">{selectedStaff.experience_years} Years</p>
                        </div>
                        {selectedStaff.pnc_number && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">PNC Number</p>
                            <p className="text-sm font-bold text-sky-600">{selectedStaff.pnc_number}</p>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <CreditCard size={14} />
                        Employment & Payment
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Hire Date</p>
                          <p className="text-sm font-bold text-slate-900">{formatPKDate(selectedStaff.hire_date)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Monthly Salary</p>
                          <p className="text-sm font-bold text-emerald-600">{formatPKR(selectedStaff.salary)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Shift Rate (12h)</p>
                          <p className="text-sm font-bold text-teal-600">{formatPKR(selectedStaff.shift_rate)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Official District</p>
                          <p className="text-sm font-bold text-slate-900">{selectedStaff.official_district}</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Documents & Status */}
                  <div className="space-y-8">
                    <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText size={14} />
                        Documents
                      </h3>
                      <div className="space-y-3">
                        {['CNIC Copy', 'PNC License', 'Degree Certificate'].map(doc => (
                          <div key={doc} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group cursor-pointer hover:bg-teal-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-xl text-slate-400 group-hover:text-teal-600 shadow-sm">
                                <FileText size={16} />
                              </div>
                              <span className="text-xs font-bold text-slate-600 group-hover:text-teal-900">{doc}</span>
                            </div>
                            <Download size={14} className="text-slate-300 group-hover:text-teal-600" />
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sparkles size={14} className="text-teal-500" />
                        AI Document Verification
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
                          <p className="text-[10px] font-bold text-teal-600 uppercase mb-2">Verify Document</p>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-teal-200 rounded-2xl cursor-pointer hover:bg-teal-100/50 transition-all">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Plus size={20} className="text-teal-400 mb-2" />
                              <p className="text-[10px] font-bold text-teal-500">Click to upload & verify</p>
                            </div>
                            <input type="file" className="hidden" onChange={handleAnalyzeImage} accept="image/*" />
                          </label>
                        </div>

                        {isAnalyzing && (
                          <div className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <Loader2 size={16} className="animate-spin text-teal-600" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Gemini is verifying...</span>
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
                    {/* Advances Section */}
                    <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <DollarSign size={14} />
                          Advance Payments
                        </h3>
                        <button 
                          onClick={() => setIsAddingAdvance(true)}
                          className="p-1.5 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {isAddingAdvance && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3"
                        >
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amount (PKR)</label>
                            <input 
                              type="number" 
                              value={advanceForm.amount}
                              onChange={(e) => setAdvanceForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                              className="w-full bg-white border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-teal-500"
                              placeholder="Enter amount"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Reason</label>
                            <input 
                              type="text" 
                              value={advanceForm.reason}
                              onChange={(e) => setAdvanceForm(prev => ({ ...prev, reason: e.target.value }))}
                              className="w-full bg-white border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-teal-500"
                              placeholder="e.g. Family emergency"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={handleAddAdvance}
                              className="flex-1 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-100"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setIsAddingAdvance(false)}
                              className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}

                      <div className="space-y-3">
                        {(!selectedStaff.advances || selectedStaff.advances.length === 0) ? (
                          <p className="text-xs text-slate-400 italic text-center py-4">No advance payments recorded</p>
                        ) : (
                          selectedStaff.advances.map((adv) => (
                            <div key={adv.id} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{formatPKR(adv.amount)}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{adv.reason || 'No reason provided'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">{formatPKDate(adv.date)}</p>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                                  adv.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                  adv.status === 'Deducted' ? 'bg-slate-100 text-slate-500' :
                                  'bg-amber-50 text-amber-600'
                                }`}>
                                  {adv.status}
                                </span>
                              </div>
                            </div>
                          ))
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
          setStaffToDelete(null);
        }}
        onConfirm={handleDeleteStaff}
        title="Delete Staff Record"
        message={`Are you sure you want to delete ${staffToDelete?.full_name}? This action cannot be undone and all associated data will be permanently removed.`}
        confirmText="Delete Record"
        type="danger"
      />
    </div>
  );
};
