'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, isReadOnly } from '@/lib/auth/role';
import type { PipelineStage } from '@/lib/queries/pipeline';

type ActionResult = { ok: true } | { ok: false; error: string };

export type DealInput = {
  companyName: string;
  contactName: string | null;
  contactPhone: string | null;
  estimatedValue: number;
  responsibleId: string | null;
  clientId: string | null;
};

export async function createDeal(input: DealInput): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };
  if (!input.companyName.trim()) return { ok: false, error: 'Empresa é obrigatória.' };

  const { data, error } = await supabase
    .from('pipeline_deals')
    .insert({
      company_name: input.companyName.trim(),
      contact_name: input.contactName || null,
      contact_phone: input.contactPhone || null,
      estimated_value: input.estimatedValue,
      responsible_id: input.responsibleId || null,
      client_id: input.clientId || null,
      stage: 'lead',
    })
    .select('id')
    .single();

  if (error || !data) return { ok: false, error: `Erro ao criar negócio: ${error?.message ?? 'desconhecido'}` };

  revalidatePath('/pipeline');
  return { ok: true, id: data.id };
}

export async function updateDeal(dealId: string, input: DealInput): Promise<ActionResult> {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };
  if (!input.companyName.trim()) return { ok: false, error: 'Empresa é obrigatória.' };

  const { data, error } = await supabase
    .from('pipeline_deals')
    .update({
      company_name: input.companyName.trim(),
      contact_name: input.contactName || null,
      contact_phone: input.contactPhone || null,
      estimated_value: input.estimatedValue,
      responsible_id: input.responsibleId || null,
      client_id: input.clientId || null,
    })
    .eq('id', dealId)
    .select('id');

  if (error) return { ok: false, error: `Erro ao salvar: ${error.message}` };
  if (!data || data.length === 0) return { ok: false, error: 'Nada foi salvo (sem permissão).' };

  revalidatePath('/pipeline');
  return { ok: true };
}

export async function updateDealStage(
  dealId: string,
  stage: PipelineStage,
  lossReason?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };

  const payload: Record<string, any> = { stage };
  if (stage === 'perdido') {
    payload.loss_reason = lossReason || null;
    payload.closed_at = new Date().toISOString();
  } else if (stage === 'fechado') {
    payload.loss_reason = null;
    payload.closed_at = new Date().toISOString();
  } else {
    payload.loss_reason = null;
    payload.closed_at = null;
  }

  const { data, error } = await supabase.from('pipeline_deals').update(payload).eq('id', dealId).select('id');

  if (error) return { ok: false, error: `Erro ao mover negócio: ${error.message}` };
  if (!data || data.length === 0) return { ok: false, error: 'Nada foi salvo (sem permissão).' };

  revalidatePath('/pipeline');
  return { ok: true };
}

export async function deleteDeal(dealId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };

  await supabase.from('pipeline_followups').delete().eq('deal_id', dealId);
  const { error } = await supabase.from('pipeline_deals').delete().eq('id', dealId);
  if (error) return { ok: false, error: `Erro ao excluir: ${error.message}` };

  revalidatePath('/pipeline');
  return { ok: true };
}

export async function addFollowup(
  dealId: string,
  content: string
): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };
  if (!content.trim()) return { ok: false, error: 'Follow-up vazio.' };

  const { data, error } = await supabase
    .from('pipeline_followups')
    .insert({
      deal_id: dealId,
      author_id: me.id,
      content: content.trim(),
      follow_up_date: new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single();

  if (error || !data) return { ok: false, error: `Erro ao salvar follow-up: ${error?.message ?? 'desconhecido'}` };

  revalidatePath('/pipeline');
  return { ok: true, id: data.id };
}
