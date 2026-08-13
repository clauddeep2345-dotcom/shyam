import { createClient } from '@/lib/supabase/server';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

export interface PeriodBoundaries {
  periodStart: string;
  periodEnd: string;
  paymentDueDate: string;
}

/**
 * Calculate payroll period boundaries for a given production date.
 * Rules:
 *   - Production Date 1st-15th  → period 1-15, due on 25th of same month
 *   - Production Date 16th-end  → period 16-end, due on 10th of next month
 */
export function calculatePeriodBoundaries(productionDate: string): PeriodBoundaries {
  const date = new Date(productionDate);
  const day = date.getDate();
  const monthStart = startOfMonth(date);

  if (day <= 15) {
    return {
      periodStart: format(monthStart, 'yyyy-MM-dd'),
      periodEnd: format(new Date(date.getFullYear(), date.getMonth(), 15), 'yyyy-MM-dd'),
      paymentDueDate: format(new Date(date.getFullYear(), date.getMonth(), 25), 'yyyy-MM-dd'),
    };
  } else {
    const nextMonth = addMonths(monthStart, 1);
    return {
      periodStart: format(new Date(date.getFullYear(), date.getMonth(), 16), 'yyyy-MM-dd'),
      periodEnd: format(endOfMonth(date), 'yyyy-MM-dd'),
      paymentDueDate: format(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10), 'yyyy-MM-dd'),
    };
  }
}

/**
 * Get or create a payroll period for a given production date.
 * If the period already exists, returns its ID. Otherwise creates it.
 */
export async function getOrCreatePayrollPeriod(productionDate: string): Promise<string> {
  const supabase = await createClient();
  const { periodStart, periodEnd, paymentDueDate } = calculatePeriodBoundaries(productionDate);

  // Try to find existing
  const { data: existing } = await supabase
    .from('payroll_periods')
    .select('id')
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .single();

  if (existing) return existing.id;

  // Create new
  const { data: created, error } = await supabase
    .from('payroll_periods')
    .insert({
      period_start: periodStart,
      period_end: periodEnd,
      payment_due_date: paymentDueDate,
      status: 'open',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create payroll period: ${error.message}`);
  return created!.id;
}

/**
 * Generate payroll periods for a range of months.
 * Useful for pre-generating upcoming periods.
 */
export function generatePeriodRanges(monthsBack: number = 3, monthsForward: number = 1): PeriodBoundaries[] {
  const today = new Date();
  const periods: PeriodBoundaries[] = [];

  for (let i = -monthsBack; i <= monthsForward; i++) {
    const month = i < 0 ? subMonths(today, Math.abs(i)) : addMonths(today, i);
    // First half
    periods.push(calculatePeriodBoundaries(format(new Date(month.getFullYear(), month.getMonth(), 1), 'yyyy-MM-dd')));
    // Second half
    periods.push(calculatePeriodBoundaries(format(new Date(month.getFullYear(), month.getMonth(), 16), 'yyyy-MM-dd')));
  }

  return periods;
}
