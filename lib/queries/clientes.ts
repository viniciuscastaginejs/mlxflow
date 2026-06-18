import type { SupabaseClient } from '@supabase/supabase-js';

export type ClientStatus =
  | 'ativo'
  | 'inativo'
  | 'suspenso'
  | 'em_contratacao'
  | 'servico_unico';

export const STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  suspenso: 'Suspenso',
  em_contratacao: 'Em contratação',
  servico_unico: 'Serviço único',
};

export const STATUS_PILL: Record<ClientStatus, string> = {
  ativo: 'pill--ok',
  inativo: 'pill--danger',
  suspenso: 'pill--warn',
  em_contratacao: 'pill--warn',
  servico_unico: 'pill--warn',
};

export type ClienteListItem = {
  id: string;
  name: string;
  nicho: string | null;
  status: ClientStatus;
  responsibleId: string | null;
  responsibleName: string | null;
  valorMensalTotal: number;
};

export type ClienteListFilters = {
  status?: ClientStatus;
  responsibleId?: string;
  showInactive?: boolean;
  // quando informado, ignora `responsibleId` e força o filtro (papel colaborador)
  scopedToUserId?: string;
};

export async function getClientesList(
  supabase: SupabaseClient,
  filters: ClienteListFilters
): Promise<ClienteListItem[]> {
  let query = supabase
    .from('clients')
    .select(
      'id, name, nicho, status, responsible_id, profiles:responsible_id(full_name)'
    )
    .order('name', { ascending: true });

  if (filters.scopedToUserId) {
    query = query.eq('responsible_id', filters.scopedToUserId);
  } else if (filters.responsibleId) {
    query = query.eq('responsible_id', filters.responsibleId);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  } else if (!filters.showInactive) {
    query = query.neq('status', 'inativo');
  }

  const { data, error } = await query;
  if (error) throw error;

  const clientes = (data ?? []) as any[];
  const ids = clientes.map((c) => c.id);

  let valoresPorCliente: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: servicos, error: servicosError } = await supabase
      .from('client_services')
      .select('client_id, monthly_value')
      .eq('active', true)
      .in('client_id', ids);
    if (servicosError) throw servicosError;

    valoresPorCliente = (servicos ?? []).reduce(
      (acc: Record<string, number>, s: any) => {
        acc[s.client_id] = (acc[s.client_id] ?? 0) + Number(s.monthly_value || 0);
        return acc;
      },
      {}
    );
  }

  return clientes.map((c) => ({
    id: c.id,
    name: c.name,
    nicho: c.nicho ?? null,
    status: c.status,
    responsibleId: c.responsible_id ?? null,
    responsibleName: c.profiles?.full_name ?? null,
    // Serviço único não é recorrente: seu valor não entra no total mensal,
    // só conta no mês em que foi de fato prestado (via receita avulsa em /financeiro).
    valorMensalTotal: c.status === 'servico_unico' ? 0 : valoresPorCliente[c.id] ?? 0,
  }));
}

export async function getResponsaveis(
  supabase: SupabaseClient
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('active', true)
    .order('full_name', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.full_name ?? '(sem nome)',
  }));
}

export async function getClientesOptions(
  supabase: SupabaseClient
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((c: any) => ({ id: c.id, name: c.name }));
}
