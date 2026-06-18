import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditLog = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  tableName: string;
  recordId: string | null;
  createdAt: string;
};

export type AuditFilters = {
  actorId?: string;
  tableName?: string;
};

export async function getAuditLogs(
  supabase: SupabaseClient,
  filters: AuditFilters,
  limit = 100
): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('id, actor_id, actor_email, action, table_name, record_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.actorId) query = query.eq('actor_id', filters.actorId);
  if (filters.tableName) query = query.eq('table_name', filters.tableName);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((l: any) => ({
    id: l.id,
    actorId: l.actor_id ?? null,
    actorEmail: l.actor_email ?? null,
    action: l.action,
    tableName: l.table_name,
    recordId: l.record_id ?? null,
    createdAt: l.created_at,
  }));
}

export async function getDistinctTables(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from('audit_logs').select('table_name').limit(1000);
  if (error) throw error;
  return [...new Set((data ?? []).map((l: any) => l.table_name))].sort();
}
