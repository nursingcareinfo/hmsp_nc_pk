import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl"
  };

  return (
    <div className={cn("flex items-center gap-3 group", className)}>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className={cn(
              "font-black tracking-tighter leading-none",
              sizeClasses[size],
              theme === 'dark' ? "text-white" : "text-slate-900"
            )}>
              NursingCare Solutions
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
