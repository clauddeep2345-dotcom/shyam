import { today } from '@/lib/utils/date';

/**
 * Check if a supervisor can edit/delete a production entry.
 * Rules:
 *   - Only the supervisor who created the entry can edit/delete it
 *   - Only entries made today (entry_date = today) can be edited/deleted
 *   - Older entries require Admin to change
 */
export function canSupervisorEdit(
  entryEnteredBy: string,
  entryDate: string,
  currentUserId: string
): { allowed: boolean; reason?: string } {
  if (entryEnteredBy !== currentUserId) {
    return { allowed: false, reason: 'You can only edit your own entries.' };
  }

  const todayStr = today();
  if (entryDate !== todayStr) {
    return {
      allowed: false,
      reason: 'You can only edit entries made today. Contact Admin to modify older entries.',
    };
  }

  return { allowed: true };
}

/**
 * Check if a supervisor can soft-delete a production entry.
 * Same rules as editing.
 */
export function canSupervisorDelete(
  entryEnteredBy: string,
  entryDate: string,
  currentUserId: string
): { allowed: boolean; reason?: string } {
  return canSupervisorEdit(entryEnteredBy, entryDate, currentUserId);
}
