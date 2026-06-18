'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, isReadOnly } from '@/lib/auth/role';
import type { Platform, PostStatus } from '@/lib/queries/editorial';

function redirectBack(clientId: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ aba: 'calendario', ...params }).toString();
  redirect(`/clientes/${clientId}?${qs}`);
}

export async function createPost(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) redirectBack(clientId, { error: 'Sem permissão.' });

  const scheduledDate = String(formData.get('scheduled_date') ?? '');
  const caption = String(formData.get('caption') ?? '').trim() || null;
  const platform = String(formData.get('platform') ?? 'instagram') as Platform;

  if (!scheduledDate) redirectBack(clientId, { error: 'Data é obrigatória.' });

  const payload: Record<string, any> = {
    client_id: clientId,
    scheduled_date: scheduledDate,
    caption,
    platform,
    status: 'rascunho',
    created_by: me.id,
  };

  const file = formData.get('file') as File | null;
  if (file && file.size > 0) {
    const path = `${clientId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('post-art').upload(path, file);
    if (!uploadError) payload.art_path = path;
  }

  const { error } = await supabase.from('editorial_posts').insert(payload);
  if (error) redirectBack(clientId, { error: `Erro ao criar post: ${error.message}` });

  revalidatePath(`/clientes/${clientId}`);
  redirectBack(clientId, { success: 'Post agendado.' });
}

export async function updatePost(clientId: string, postId: string, formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) redirectBack(clientId, { error: 'Sem permissão.' });

  const scheduledDate = String(formData.get('scheduled_date') ?? '');
  const caption = String(formData.get('caption') ?? '').trim() || null;
  const platform = String(formData.get('platform') ?? 'instagram') as Platform;
  const status = String(formData.get('status') ?? 'rascunho') as PostStatus;

  if (!scheduledDate) redirectBack(clientId, { error: 'Data é obrigatória.' });

  const payload: Record<string, any> = {
    scheduled_date: scheduledDate,
    caption,
    platform,
    status,
  };

  const file = formData.get('file') as File | null;
  if (file && file.size > 0) {
    const path = `${clientId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('post-art').upload(path, file);
    if (!uploadError) payload.art_path = path;
  }

  const { error } = await supabase.from('editorial_posts').update(payload).eq('id', postId);
  if (error) redirectBack(clientId, { error: `Erro ao salvar post: ${error.message}` });

  revalidatePath(`/clientes/${clientId}`);
  redirectBack(clientId, { success: 'Post salvo.' });
}

export async function deletePost(clientId: string, postId: string, formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) redirectBack(clientId, { error: 'Sem permissão.' });

  const { error } = await supabase.from('editorial_posts').delete().eq('id', postId);
  if (error) redirectBack(clientId, { error: `Erro ao excluir post: ${error.message}` });

  revalidatePath(`/clientes/${clientId}`);
  redirectBack(clientId, { success: 'Post excluído.' });
}
