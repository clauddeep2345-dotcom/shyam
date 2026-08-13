import { format, parseISO, isValid, startOfMonth, endOfMonth, addMonths, isFuture } from 'date-fns';

/**
 * Format a date string for display
 */
export function formatDate(date: string | Date, formatStr: string = 'dd MMM yyyy'): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '—';
  return format(parsed, formatStr);
}

/**
 * Format a date string for display with time
 */
export function formatDateTime(date: string | Date): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd MMM yyyy, hh:mm a');
}

/**
 * Format a date for form input (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '';
  return format(parsed, 'yyyy-MM-dd');
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(date: string): boolean {
  return isFuture(parseISO(date));
}

/**
 * Get the payroll period boundaries for a given production date
 */
export function getPayrollPeriod(productionDate: string): {
  periodStart: string;
  periodEnd: string;
  paymentDueDate: string;
  periodLabel: string;
} {
  const date = parseISO(productionDate);
  const day = date.getDate();
  const monthStart = startOfMonth(date);

  if (day <= 15) {
    const periodStart = format(monthStart, 'yyyy-MM-dd');
    const periodEnd = format(new Date(date.getFullYear(), date.getMonth(), 15), 'yyyy-MM-dd');
    const paymentDueDate = format(new Date(date.getFullYear(), date.getMonth(), 25), 'yyyy-MM-dd');
    const periodLabel = `${format(date, 'MMM yyyy')} (1st–15th)`;
    return { periodStart, periodEnd, paymentDueDate, periodLabel };
  } else {
    const periodStart = format(new Date(date.getFullYear(), date.getMonth(), 16), 'yyyy-MM-dd');
    const periodEnd = format(endOfMonth(date), 'yyyy-MM-dd');
    const nextMonth = addMonths(monthStart, 1);
    const paymentDueDate = format(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10), 'yyyy-MM-dd');
    const periodLabel = `${format(date, 'MMM yyyy')} (16th–${format(endOfMonth(date), 'do')})`;
    return { periodStart, periodEnd, paymentDueDate, periodLabel };
  }
}

/**
 * Format a payroll period for display
 */
export function formatPeriodLabel(periodStart: string, periodEnd: string): string {
  const start = parseISO(periodStart);
  const end = parseISO(periodEnd);
  return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
}
