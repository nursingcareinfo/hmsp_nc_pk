// App-wide constants

// Super admin emails - accounts with full access
export const SUPER_ADMIN_EMAILS = [
  'nursingcareinfo21@gmail.com',
  'theo@hmsp.local'
];
export const SUPER_ADMIN_EMAIL = SUPER_ADMIN_EMAILS[0]; // Keep for backward compatibility

// Maximum number of admin users allowed
export const MAX_ADMINS = 2;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 12;

// Payroll defaults
export const DEFAULT_ALLOWANCES = 2000;
export const DEFAULT_DEDUCTIONS = 500;
export const DEFAULT_SHIFT_RATE = 1500;

// Re-export staff data for backward compatibility
export { INITIAL_STAFF } from './staffData';

export const INITIAL_PATIENTS: any[] = [];

// Demo mode configuration
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const DEMO_MAX_PATIENTS = 3;
export const DEMO_MAX_STAFF = 10;
