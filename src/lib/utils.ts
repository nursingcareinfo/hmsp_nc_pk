import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format as dateFnsFormat, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as Pakistani Rupee (PKR)
 * Uses the Pakistani numbering system (Lakh, Crore)
 */
export function formatPKR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return 'Rs. 0';
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs.');
  } catch (e) {
    // Fallback if en-PK is not supported
    return `Rs. ${amount.toLocaleString('en-IN')}`;
  }
}

/**
 * Formats a date string to Pakistani format (DD-MM-YYYY)
 */
export function formatPKDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return dateFnsFormat(date, 'dd-MM-yyyy');
  } catch (e) {
    return dateStr;
  }
}

/**
 * Formats a time string or date to Pakistani format (hh:mm AM/PM)
 */
export function formatPKTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return dateFnsFormat(date, 'hh:mm a');
  } catch (e) {
    return dateStr;
  }
}

/**
 * Formats a CNIC number to XXXXX-XXXXXXX-X
 */
export function formatCNIC(cnic: string | undefined | null): string {
  if (!cnic) return '-';
  const cleaned = cnic.replace(/\D/g, '');
  if (cleaned.length !== 13) return cnic;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12)}`;
}

/**
 * Formats a phone number to Pakistani mobile format (03XX-XXXXXXX)
 */
export function formatPKPhone(phone: string | undefined | null): string {
  if (!phone) return '-';
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle international format +92
  if (cleaned.startsWith('92')) {
    cleaned = '0' + cleaned.slice(2);
  }
  
  // Ensure it starts with 0 if it's a local number
  if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }

  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  
  return phone;
}
