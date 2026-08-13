'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { AuditAction, EntityType } from '@/lib/types/database';

/**
 * Write an audit log entry.
 * Uses the admin client to bypass RLS (all authenticated users can insert).
 */
export async function writeAuditLog(params: {
  userId: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  const admin = createAdminClient();

  await admin.from('audit_log').insert({
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    old_value: params.oldValue || null,
    new_value: params.newValue || null,
  });
}

/**
 * Fetch audit log entries with optional filters.
 */
export async function getAuditLog(params?: {
  entityType?: string;
  action?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('audit_log')
    .select('*, users!inner(name)')
    .order('created_at', { ascending: false });

  if (params?.entityType) query = query.eq('entity_type', params.entityType);
  if (params?.action) query = query.eq('action', params.action);
  if (params?.userId) query = query.eq('user_id', params.userId);

  const limit = params?.limit || 50;
  const offset = params?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
