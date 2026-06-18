import type { SupabaseClient } from '@supabase/supabase-js';

export type PropostaServico = { service: string; value: number };

export type Proposta = {
  id: string;
  clientId: string | null;
  companyName: string;
  contactName: string | null;
  services: PropostaServico[];
  planValue: number;
  filePath: string | null;
  createdAt: string;
};

export async function getPropostas(supabase: SupabaseClient): Promise<Proposta[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('id, client_id, company_name, contact_name, services, plan_value, file_path, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    clientId: p.client_id ?? null,
    companyName: p.company_name,
    contactName: p.contact_name ?? null,
    services: Array.isArray(p.services) ? p.services : [],
    planValue: Number(p.plan_value || 0),
    filePath: p.file_path ?? null,
    createdAt: p.created_at,
  }));
}
