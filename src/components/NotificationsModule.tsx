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
import { formatPKDate, formatPKTime } from '../lib/utils';

export const NotificationsModule = () => {
  const { notifications, markNotificationAsRead, clearNotifications } = useUIStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />;
      case 'warning': return <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />;
      case 'error': return <X size={20} className="text-rose-600 dark:text-rose-400" />;
      default: return <Info size={20} className="text-sky-600 dark:text-sky-400" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800';
      case 'warning': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800';
      case 'error': return 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800';
      default: return 'bg-sky-50 dark:bg-sky-900/20 border-sky-100 dark:border-sky-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">System Notifications</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Stay updated with system alerts and activities</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => notifications.forEach(n => markNotificationAsRead(n.id))}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <CheckCheck size={18} />
            Mark all as read
          </button>
          <button 
            onClick={clearNotifications}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
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
                      <h4 className="font-black text-slate-900 dark:text-white tracking-tight">{n.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <Clock size={12} />
                        {formatPKDate(n.timestamp)} {formatPKTime(n.timestamp)}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{n.message}</p>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.read && (
                      <button 
                        onClick={() => markNotificationAsRead(n.id)}
                        className="p-2 bg-white dark:bg-slate-900 rounded-xl text-slate-400 hover:text-teal-600 shadow-sm transition-all"
                        title="Mark as read"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                    <button className="p-2 bg-white dark:bg-slate-900 rounded-xl text-slate-400 hover:text-rose-600 shadow-sm transition-all">
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
