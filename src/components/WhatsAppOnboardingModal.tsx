import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Check, Loader2, Copy, Phone, User, MapPin, Activity } from 'lucide-react';
import { parseWhatsAppMessage, autoRegisterFromWhatsApp, WHATSAPP_WELCOME_MESSAGE, WhatsAppParseResult } from '../services/whatsappService';
import { Patient } from '../types';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { dataService } from '../dataService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WhatsAppOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: (patient: Patient) => void;
}

export const WhatsAppOnboardingModal: React.FC<WhatsAppOnboardingModalProps> = ({
  isOpen,
  onClose,
  onPatientCreated,
}) => {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<WhatsAppParseResult | null>(null);
  const [step, setStep] = useState<'input' | 'preview' | 'success'>('input');
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);

  const handleParse = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await parseWhatsAppMessage(message);
      setParseResult(result);
      
      if (result.success && result.patient) {
        setStep('preview');
      } else {
        toast.error(result.error || 'Could not parse message. Please provide more details.');
      }
    } catch (error) {
      toast.error('Failed to parse message');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!parseResult?.patient) return;

    setIsProcessing(true);
    
    try {
      const patient = await dataService.addPatient(parseResult.patient as Omit<Patient, 'id'>);
      setCreatedPatient(patient);
      setStep('success');
      onPatientCreated(patient);
      toast.success('Patient registered successfully!');
    } catch (error) {
      toast.error('Failed to create patient');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setMessage('');
    setParseResult(null);
    setStep('input');
    setCreatedPatient(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const copyWelcomeMessage = () => {
    navigator.clipboard.writeText(WHATSAPP_WELCOME_MESSAGE.replace(/\*/g, ''));
    toast.success('Welcome message copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">WhatsApp Onboarding</h2>
              <p className="text-emerald-100 text-xs font-medium">
                {step === 'input' ? 'Paste WhatsApp message to register patient' : 
                 step === 'preview' ? 'Review extracted data' : 'Registration complete'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            {step === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Welcome message template */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      WhatsApp Template
                    </h3>
                    <button
                      onClick={copyWelcomeMessage}
                      className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-bold"
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {WHATSAPP_WELCOME_MESSAGE.replace(/\*/g, '')}
                  </pre>
                </div>

                {/* Message input */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Patient's WhatsApp Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Paste the WhatsApp message here..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white min-h-[150px] resize-none"
                  />
                </div>

                {/* Quick tips */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    💡 <strong>Tip:</strong> The AI can parse messages in any format. Just paste the patient's WhatsApp message and it will extract name, CNIC, phone, address, medical condition, and service type automatically.
                  </p>
                </div>

                {/* Parse button */}
                <button
                  onClick={handleParse}
                  disabled={isProcessing || !message.trim()}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <MessageSquare size={18} />
                      Parse Message
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {step === 'preview' && parseResult?.patient && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Confidence indicator */}
                <div className={cn(
                  "p-4 rounded-2xl border",
                  parseResult.confidence >= 80
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800"
                    : parseResult.confidence >= 60
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"
                    : "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl",
                      parseResult.confidence >= 80
                        ? "bg-emerald-600"
                        : parseResult.confidence >= 60
                        ? "bg-amber-600"
                        : "bg-rose-600"
                    )}>
                      <Check size={20} className="text-white" />
                    </div>
                    <div>
                      <p className={cn(
                        "font-bold",
                        parseResult.confidence >= 80
                          ? "text-emerald-900 dark:text-emerald-400"
                          : parseResult.confidence >= 60
                          ? "text-amber-900 dark:text-amber-400"
                          : "text-rose-900 dark:text-rose-400"
                      )}>
                        {parseResult.confidence}% Data Confidence
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {parseResult.confidence >= 80
                          ? 'All key fields extracted successfully'
                          : parseResult.confidence >= 60
                          ? 'Most fields extracted, review before creating'
                          : 'Some fields may be missing, please verify'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Extracted data preview */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Extracted Patient Data
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <User size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Name</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {parseResult.patient.full_name || '—'}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {parseResult.patient.contact || '—'}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">District</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {parseResult.patient.district || '—'}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Service</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {parseResult.patient.service_type || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity size={14} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Medical Condition</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {parseResult.patient.medical_condition || '—'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Address</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {parseResult.patient.address || '—'}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleCreatePatient}
                    disabled={isProcessing}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <Check size={18} />
                        Create Patient
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && createdPatient && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-12 gap-6 text-center"
              >
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <Check size={40} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    Patient Registered!
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {createdPatient.full_name} has been added to the system
                  </p>
                </div>

                <div className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Name</span>
                    <span className="font-bold text-slate-900 dark:text-white">{createdPatient.full_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-bold text-slate-900 dark:text-white">{createdPatient.contact}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Service</span>
                    <span className="font-bold text-slate-900 dark:text-white">{createdPatient.service_type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Status</span>
                    <span className="font-bold text-amber-600">Pending Assignment</span>
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 hover:scale-105 transition-all"
                >
                  Register Another
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
