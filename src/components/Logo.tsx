import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import logoImage from '../assets/nursing-care-logo.png';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LogoProps {
  className?: string;
  showText?: boolean;
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className, showText = true, theme = 'light', size = 'md' }) => {
  const sizeClasses = {
    sm: showText ? "w-24 h-10" : "w-10 h-10",
    md: showText ? "w-56 h-24" : "w-24 h-24",
    lg: showText ? "w-72 h-32" : "w-32 h-32"
  };

  return (
    <div className={cn("flex items-center gap-3 group", className)}>
      <div className="relative">
        <div className={cn(
          "bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-500 border border-slate-100 dark:border-slate-800 ring-4 ring-slate-50/50 p-2",
          sizeClasses[size]
        )}>
          <img
            src={logoImage}
            alt="Nursing Care Logo"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
          />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className={cn(
              "font-black text-4xl tracking-tighter leading-none",
              theme === 'dark' ? "text-white" : "text-slate-900"
            )}>
              H.M.S.P
            </span>
          </div>
          <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-2">
            Karachi Portal
          </span>
        </div>
      )}
    </div>
  );
};
