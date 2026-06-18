import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType =
  | 'pagamento_vencendo'
  | 'tarefa_atrasada'
  | 'post_pendente'
  | 'lead_sem_followup'
  | 'geral';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  relatedTable: string | null;
  relatedId: string | null;
  read: boolean;
  createdAt: string;
};

export async function getNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, related_table, related_id, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    relatedTable: n.related_table ?? null,
    relatedId: n.related_id ?? null,
    read: !!n.read,
    createdAt: n.created_at,
  }));
}

export async function getUnreadCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
  return count ?? 0;
}
