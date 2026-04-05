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
 * Formats a phone number to Pakistani mobile format (03xx-xxxxxxx)
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

/**
 * Auto-format CNIC as user types: xxxxx-xxxxxxx-x
 * Strips non-digits, inserts dashes at positions 5 and 12
 */
export function autoFormatCNIC(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/**
 * Auto-format Pakistani phone as user types: 03xx-xxxxxxx
 * Strips non-digits, inserts dash at position 4
 */
export function autoFormatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');

  // Convert +92 prefix to 0
  if (digits.startsWith('92') && digits.length > 2) {
    digits = '0' + digits.slice(2);
  }
  // Strip leading + if present
  if (digits.startsWith('0') && digits.length > 11) {
    digits = digits.slice(0, 11);
  }

  digits = digits.slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}
