/**
 * Date Utilities for Karachi Nursing Care (H.M.S.P)
 * Handles Karachi (PKT, UTC+5) time specifically to avoid date-behind bugs.
 */

/**
 * Returns the current date in Karachi (PKT) as an ISO-formatted string (YYYY-MM-DD).
 */
export function getKarachiToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
}

/**
 * Converts any Date object to a Karachi (PKT) ISO-formatted string (YYYY-MM-DD).
 */
export function toKarachiISO(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
}

/**
 * Returns the current time in Karachi (PKT) as a string (HH:MM:SS).
 */
export function getKarachiTime(): string {
  return new Date().toLocaleTimeString('en-GB', { 
    timeZone: 'Asia/Karachi',
    hour12: false 
  });
}

/**
 * Determines the current shift in Karachi based on PKT.
 * Day: 07:00:00 - 18:59:59
 * Night: 19:00:00 - 06:59:59
 */
export function getCurrentShift(): 'day' | 'night' {
  const time = getKarachiTime();
  const hour = parseInt(time.split(':')[0], 10);
  
  if (hour >= 7 && hour < 19) {
    return 'day';
  }
  return 'night';
}

/**
 * Formats a date string into a more readable format for the UI.
 */
export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '---';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
