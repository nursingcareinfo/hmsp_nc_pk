import React from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  X, 
  Trash2, 
  CheckCheck,
  ChevronRight,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUIStore } from '../store';
import { format } from 'date-fns';

export const NotificationsModule = () => {
  const { notifications, markNotificationAsRead, clearNotifications } = useUIStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={20} className="text-emerald-600" />;
      case 'warning': return <AlertCircle size={20} className="text-amber-600" />;
      case 'error': return <X size={20} className="text-rose-600" />;
      default: return <Info size={20} className="text-sky-600" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 border-emerald-100';
      case 'warning': return 'bg-amber-50 border-amber-100';
      case 'error': return 'bg-rose-50 border-rose-100';
      default: return 'bg-sky-50 border-sky-100';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Notifications</h2>
          <p className="text-slate-500 text-sm font-medium">Stay updated with system alerts and activities</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => notifications.forEach(n => markNotificationAsRead(n.id))}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <CheckCheck size={18} />
            Mark all as read
          </button>
          <button 
            onClick={clearNotifications}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold hover:bg-rose-100 transition-all"
          >
            <Trash2 size={18} />
            Clear all
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {notifications.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <Bell size={40} />
              </div>
              <p className="text-slate-400 font-medium">No notifications at the moment.</p>
            </motion.div>
          ) : (
            notifications.map((n) => (
              <motion.div
                layout
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={cn(
                  "p-6 rounded-3xl border transition-all relative group",
                  getBg(n.type),
                  !n.read ? "shadow-lg shadow-slate-100" : "opacity-60"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getIcon(n.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-black text-slate-900 tracking-tight">{n.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Clock size={12} />
                        {format(new Date(n.timestamp), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{n.message}</p>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.read && (
                      <button 
                        onClick={() => markNotificationAsRead(n.id)}
                        className="p-2 bg-white rounded-xl text-slate-400 hover:text-teal-600 shadow-sm transition-all"
                        title="Mark as read"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                    <button className="p-2 bg-white rounded-xl text-slate-400 hover:text-rose-600 shadow-sm transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                {!n.read && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-teal-600 rounded-r-full" />
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Helper function for tailwind classes (copied from App.tsx for simplicity)
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
