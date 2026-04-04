import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: "bg-rose-600 hover:bg-rose-700 shadow-rose-100",
    warning: "bg-amber-600 hover:bg-amber-700 shadow-amber-100",
    info: "bg-teal-600 hover:bg-teal-700 shadow-teal-100"
  };

  const iconColors = {
    danger: "text-rose-600 bg-rose-50",
    warning: "text-amber-600 bg-amber-50",
    info: "text-teal-600 bg-teal-50"
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
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
          className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden p-8"
        >
          <div className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${iconColors[type]}`}>
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
              {message}
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
              >
                {cancelText}
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-6 py-3 text-white rounded-2xl font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${colors[type]}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
