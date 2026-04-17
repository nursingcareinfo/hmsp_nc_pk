/**
 * Salary Standards by Designation
 * Shared across HR Compensation tab and patient-card rate editing.
 * Used for outlier detection, min/max guardrails, and visual badges.
 */

export interface SalaryStandard {
  min: number;
  max: number;
  unit: string;
  label: string;
}

export const SALARY_STANDARDS: Record<string, SalaryStandard> = {
  Nurse: { min: 2500, max: 3500, unit: 'shift', label: 'Rs. 2,500-3,500/shift' },
  'Nurse Assistant': { min: 1800, max: 2500, unit: 'shift', label: 'Rs. 1,800-2,500/shift' },
  Attendant: { min: 1200, max: 1500, unit: 'shift', label: 'Rs. 1,200-1,500/shift' },
  'Mid Wife': { min: 1500, max: 2000, unit: 'shift', label: 'Rs. 1,500-2,000/shift' },
  Midwife: { min: 1500, max: 2000, unit: 'shift', label: 'Rs. 1,500-2,000/shift' },
  Technician: { min: 1500, max: 2000, unit: 'shift', label: 'Rs. 1,500-2,000/shift' },
  Doctor: { min: 5000, max: 5000, unit: 'visit', label: 'Rs. 5,000/visit' },
  default: { min: 1000, max: 10000, unit: 'shift', label: 'Rs. 1,000-10,000/shift' },
};

export function getSalaryStandard(designation: string): SalaryStandard {
  return SALARY_STANDARDS[designation] || SALARY_STANDARDS['default'];
}

export type RateStatus = 'ok' | 'below' | 'above';

export function getRateStatus(rate: number, standard: SalaryStandard): RateStatus {
  if (rate < standard.min) return 'below';
  if (rate > standard.max) return 'above';
  return 'ok';
}

/** Absolute hard limits — never allow rates outside this range */
export const RATE_HARD_MIN = 500;
export const RATE_HARD_MAX = 10000;

/** Step presets for quick rate adjustment */
export const RATE_STEPS = [100, 200, 500];
