import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientStatus } from './clientes';

export type ClienteDetalhe = {
  id: string;
  name: string;
  nicho: string | null;
  contactName: string | null;
  contactEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  status: ClientStatus;
  responsibleId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceType =
  | 'meta_ads'
  | 'landing_page'
  | 'social_media'
  | 'consultoria';

export type ClientServiceRow = {
  id: string;
  service: ServiceType;
  monthlyValue: number;
  active: boolean;
};

export type ContractRow = {
  id: string;
  monthlyValue: number;
  startDate: string | null;
  dueDay: number | null;
  endDate: string | null;
  filePath: string | null;
} | null;

export type ClienteFinanceiro = {
  totalPago: number;
  totalEmAberto: number;
  totalAno: number;
} | null;

export type ClientMetricRow = {
  id: string;
  leads: number;
  cpl: number | null;
  spend: number;
  referenceMonth: string;
};

export type ClientNoteRow = {
  id: string;
  authorName: string | null;
  content: string;
  createdAt: string;
};

export type ClientFileRow = {
  id: string;
  fileName: string;
  filePath: string;
  uploadedByName: string | null;
  createdAt: string;
};

export type OnboardingItemRow = {
  id: string;
  label: string;
  done: boolean;
  position: number;
};

export async function getClienteDetalhe(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClienteDetalhe | null> {
  const { data, error } = await supabase
    .from('clients')
    .select(
      'id, name, nicho, contact_name, contact_email, phone, whatsapp, instagram, status, responsible_id, created_at, updated_at'
    )
    .eq('id', clientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    nicho: data.nicho ?? null,
    contactName: data.contact_name ?? null,
    contactEmail: data.contact_email ?? null,
    phone: data.phone ?? null,
    whatsapp: data.whatsapp ?? null,
    instagram: data.instagram ?? null,
    status: data.status,
    responsibleId: data.responsible_id ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getClientServices(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientServiceRow[]> {
  const { data, error } = await supabase
    .from('client_services')
    .select('id, service, monthly_value, active')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((s: any) => ({
    id: s.id,
    service: s.service,
    monthlyValue: Number(s.monthly_value || 0),
    active: !!s.active,
  }));
}

export async function getContract(
  supabase: SupabaseClient,
  clientId: string
): Promise<ContractRow> {
  const { data, error } = await supabase
    .from('contracts')
    .select('id, monthly_value, start_date, due_day, end_date, file_path')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    monthlyValue: Number(data.monthly_value || 0),
    startDate: data.start_date ?? null,
    dueDay: data.due_day ?? null,
    endDate: data.end_date ?? null,
    filePath: data.file_path ?? null,
  };
}

export async function getClienteFinanceiro(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClienteFinanceiro> {
  const { data, error } = await supabase
    .from('v_client_financials')
    .select('total_pago, total_em_aberto, total_ano')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { totalPago: 0, totalEmAberto: 0, totalAno: 0 };

  return {
    totalPago: Number(data.total_pago ?? 0),
    totalEmAberto: Number(data.total_em_aberto ?? 0),
    totalAno: Number(data.total_ano ?? 0),
  };
}

export async function getClientMetrics(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientMetricRow[]> {
  const { data, error } = await supabase
    .from('client_metrics')
    .select('id, leads, cpl, meta_ads_spend, reference_month')
    .eq('client_id', clientId)
    .order('reference_month', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    leads: r.leads ?? 0,
    cpl: r.cpl ?? null,
    spend: Number(r.meta_ads_spend ?? 0),
    referenceMonth: r.reference_month,
  }));
}

export async function getClientNotes(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientNoteRow[]> {
  const { data, error } = await supabase
    .from('client_notes')
    .select('id, content, created_at, profiles:author_id(full_name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((n: any) => ({
    id: n.id,
    authorName: n.profiles?.full_name ?? null,
    content: n.content,
    createdAt: n.created_at,
  }));
}

export async function getClientFiles(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientFileRow[]> {
  const { data, error } = await supabase
    .from('client_files')
    .select('id, file_name, file_path, created_at, profiles:uploaded_by(full_name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((f: any) => ({
    id: f.id,
    fileName: f.file_name,
    filePath: f.file_path,
    uploadedByName: f.profiles?.full_name ?? null,
    createdAt: f.created_at,
  }));
}

export async function getOnboardingItems(
  supabase: SupabaseClient,
  clientId: string
): Promise<OnboardingItemRow[]> {
  const { data, error } = await supabase
    .from('client_onboarding_items')
    .select('id, label, done, position')
    .eq('client_id', clientId)
    .order('position', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((i: any) => ({
    id: i.id,
    label: i.label ?? '',
    done: !!i.done,
    position: i.position ?? 0,
  }));
}
