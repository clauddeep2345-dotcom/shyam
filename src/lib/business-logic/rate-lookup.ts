import { createClient } from '@/lib/supabase/server';

/**
 * Look up the effective rate for a machine on a given production date.
 * Returns the rate_per_meter that was effective on that date.
 * The rate is determined by: effective_from <= production_date AND (effective_to IS NULL OR effective_to >= production_date)
 */
export async function lookupRate(machineId: string, productionDate: string): Promise<number | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('machine_rates')
    .select('rate_per_meter')
    .eq('machine_id', machineId)
    .lte('effective_from', productionDate)
    .or(`effective_to.is.null,effective_to.gte.${productionDate}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return Number(data.rate_per_meter);
}

/**
 * Validate that a new rate doesn't conflict with existing rates for the same machine.
 * Returns an error message if there's a conflict, null if OK.
 */
export async function validateRateNoOverlap(
  machineId: string,
  effectiveFrom: string,
  excludeRateId?: string
): Promise<string | null> {
  const supabase = await createClient();

  let query = supabase
    .from('machine_rates')
    .select('id, effective_from, effective_to')
    .eq('machine_id', machineId)
    .eq('effective_from', effectiveFrom);

  if (excludeRateId) {
    query = query.neq('id', excludeRateId);
  }

  const { data } = await query;

  if (data && data.length > 0) {
    return `A rate already exists for this machine with effective date ${effectiveFrom}. Edit the existing rate instead.`;
  }

  return null;
}
