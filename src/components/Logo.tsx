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
    sm: showText ? "w-12 h-12" : "w-10 h-10",
    md: showText ? "w-28 h-14" : "w-14 h-14",
    lg: showText ? "w-40 h-20" : "w-20 h-20"
  };

  return (
    <div className={cn("flex items-center gap-3 group", className)}>
      <div className="relative">
        <div className={cn(
          "bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-500 border border-slate-100 ring-4 ring-slate-50/50 p-2",
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
              Nursing<span className="text-teal-600">Care</span>
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
