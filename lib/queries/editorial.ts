import type { SupabaseClient } from '@supabase/supabase-js';

export type Platform = 'instagram' | 'facebook' | 'tiktok';
export type PostStatus = 'rascunho' | 'aprovacao_pendente' | 'aprovado' | 'publicado';

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

export const STATUS_LABEL: Record<PostStatus, string> = {
  rascunho: 'Rascunho',
  aprovacao_pendente: 'Aprovação pendente',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
};

export const STATUS_PILL: Record<PostStatus, string> = {
  rascunho: 'pill--warn',
  aprovacao_pendente: 'pill--warn',
  aprovado: 'pill--ok',
  publicado: 'pill--ok',
};

export type EditorialPost = {
  id: string;
  clientId: string;
  scheduledDate: string;
  caption: string | null;
  artPath: string | null;
  platform: Platform;
  status: PostStatus;
  approvalToken: string;
  approvedAt: string | null;
  approvalNote: string | null;
};

export async function getClientPosts(
  supabase: SupabaseClient,
  clientId: string,
  filters: { platform?: Platform } = {}
): Promise<EditorialPost[]> {
  let query = supabase
    .from('editorial_posts')
    .select(
      'id, client_id, scheduled_date, caption, art_path, platform, status, approval_token, approved_at, approval_note'
    )
    .eq('client_id', clientId)
    .order('scheduled_date', { ascending: true });

  if (filters.platform) {
    query = query.eq('platform', filters.platform);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    clientId: p.client_id,
    scheduledDate: p.scheduled_date,
    caption: p.caption ?? null,
    artPath: p.art_path ?? null,
    platform: p.platform,
    status: p.status,
    approvalToken: p.approval_token,
    approvedAt: p.approved_at ?? null,
    approvalNote: p.approval_note ?? null,
  }));
}

export type EditorialPostComCliente = EditorialPost & { clientName: string | null };

export async function getAllPosts(
  supabase: SupabaseClient,
  filters: { platform?: Platform; clientId?: string } = {}
): Promise<EditorialPostComCliente[]> {
  let query = supabase
    .from('editorial_posts')
    .select(
      'id, client_id, scheduled_date, caption, art_path, platform, status, approval_token, approved_at, approval_note'
    )
    .order('scheduled_date', { ascending: true });

  if (filters.platform) query = query.eq('platform', filters.platform);
  if (filters.clientId) query = query.eq('client_id', filters.clientId);

  const { data, error } = await query;
  if (error) throw error;

  const posts = (data ?? []) as any[];
  const clientIds = [...new Set(posts.map((p) => p.client_id).filter(Boolean))];

  let nameByClientId: Record<string, string> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase.from('clients').select('id, name').in('id', clientIds);
    nameByClientId = (clients ?? []).reduce((acc: Record<string, string>, c: any) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
  }

  return posts.map((p) => ({
    id: p.id,
    clientId: p.client_id,
    clientName: nameByClientId[p.client_id] ?? null,
    scheduledDate: p.scheduled_date,
    caption: p.caption ?? null,
    artPath: p.art_path ?? null,
    platform: p.platform,
    status: p.status,
    approvalToken: p.approval_token,
    approvedAt: p.approved_at ?? null,
    approvalNote: p.approval_note ?? null,
  }));
}

export async function getPostByToken(
  supabase: SupabaseClient,
  token: string
): Promise<EditorialPost | null> {
  const { data, error } = await supabase
    .from('editorial_posts')
    .select(
      'id, client_id, scheduled_date, caption, art_path, platform, status, approval_token, approved_at, approval_note'
    )
    .eq('approval_token', token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    clientId: data.client_id,
    scheduledDate: data.scheduled_date,
    caption: data.caption ?? null,
    artPath: data.art_path ?? null,
    platform: data.platform,
    status: data.status,
    approvalToken: data.approval_token,
    approvedAt: data.approved_at ?? null,
    approvalNote: data.approval_note ?? null,
  };
}
