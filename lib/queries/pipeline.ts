import type { SupabaseClient } from '@supabase/supabase-js';

export type PipelineStage = 'lead' | 'reuniao_agendada' | 'proposta_enviada' | 'fechado' | 'perdido';

export const STAGE_LABEL: Record<PipelineStage, string> = {
  lead: 'Lead',
  reuniao_agendada: 'Reunião agendada',
  proposta_enviada: 'Proposta enviada',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

export type Followup = {
  id: string;
  authorName: string | null;
  content: string;
  followUpDate: string | null;
  createdAt: string;
};

export type Deal = {
  id: string;
  companyName: string;
  contactName: string | null;
  contactPhone: string | null;
  stage: PipelineStage;
  estimatedValue: number;
  lossReason: string | null;
  clientId: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  followups: Followup[];
};

export type DealFilters = {
  responsibleId?: string;
  scopedToUserId?: string;
};

export async function getDeals(supabase: SupabaseClient, filters: DealFilters): Promise<Deal[]> {
  let query = supabase
    .from('pipeline_deals')
    .select('id, company_name, contact_name, contact_phone, stage, estimated_value, loss_reason, client_id, responsible_id')
    .order('created_at', { ascending: true });

  if (filters.scopedToUserId) {
    query = query.eq('responsible_id', filters.scopedToUserId);
  } else if (filters.responsibleId) {
    query = query.eq('responsible_id', filters.responsibleId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const deals = (data ?? []) as any[];
  const dealIds = deals.map((d) => d.id);
  const responsibleIds = [...new Set(deals.map((d) => d.responsible_id).filter(Boolean))];

  let followupsByDeal: Record<string, Followup[]> = {};
  if (dealIds.length > 0) {
    const { data: followups, error: fError } = await supabase
      .from('pipeline_followups')
      .select('id, deal_id, author_id, content, follow_up_date, created_at')
      .in('deal_id', dealIds)
      .order('created_at', { ascending: false });
    if (fError) throw fError;

    const authorIds = [...new Set((followups ?? []).map((f: any) => f.author_id).filter(Boolean))];
    let nameByAuthorId: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: authors } = await supabase.from('profiles').select('id, full_name').in('id', authorIds);
      nameByAuthorId = (authors ?? []).reduce((acc: Record<string, string>, a: any) => {
        acc[a.id] = a.full_name ?? '';
        return acc;
      }, {});
    }

    followupsByDeal = (followups ?? []).reduce((acc: Record<string, Followup[]>, f: any) => {
      (acc[f.deal_id] ??= []).push({
        id: f.id,
        authorName: f.author_id ? nameByAuthorId[f.author_id] ?? null : null,
        content: f.content,
        followUpDate: f.follow_up_date ?? null,
        createdAt: f.created_at,
      });
      return acc;
    }, {});
  }

  let nameByResponsibleId: Record<string, string> = {};
  if (responsibleIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', responsibleIds);
    nameByResponsibleId = (profiles ?? []).reduce((acc: Record<string, string>, p: any) => {
      acc[p.id] = p.full_name ?? '';
      return acc;
    }, {});
  }

  return deals.map((d) => ({
    id: d.id,
    companyName: d.company_name,
    contactName: d.contact_name ?? null,
    contactPhone: d.contact_phone ?? null,
    stage: d.stage,
    estimatedValue: Number(d.estimated_value || 0),
    lossReason: d.loss_reason ?? null,
    clientId: d.client_id ?? null,
    responsibleId: d.responsible_id ?? null,
    responsibleName: d.responsible_id ? nameByResponsibleId[d.responsible_id] ?? null : null,
    followups: followupsByDeal[d.id] ?? [],
  }));
}

export function taxaConversao(deals: Deal[]): number {
  if (deals.length === 0) return 0;
  const fechados = deals.filter((d) => d.stage === 'fechado').length;
  return (fechados / deals.length) * 100;
}
