'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canManageClients, isReadOnly } from '@/lib/auth/role';

function fieldsFromDados(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    nicho: String(formData.get('nicho') ?? '').trim() || null,
    contact_name: String(formData.get('contact_name') ?? '').trim() || null,
    contact_email: String(formData.get('contact_email') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    whatsapp: String(formData.get('whatsapp') ?? '').trim() || null,
    instagram: String(formData.get('instagram') ?? '').trim() || null,
    status: String(formData.get('status') ?? 'em_contratacao'),
    responsible_id: String(formData.get('responsible_id') ?? '') || null,
  };
}

export async function createCliente(formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageClients(me.role)) {
    redirect('/clientes?error=' + encodeURIComponent('Sem permissão.'));
  }

  const payload = fieldsFromDados(formData);
  if (!payload.name) {
    redirect('/clientes/novo?error=' + encodeURIComponent('Nome é obrigatório.'));
  }

  const { data: client, error } = await supabase
    .from('clients')
    .insert(payload)
    .select('id')
    .single();

  if (error || !client) {
    redirect('/clientes/novo?error=' + encodeURIComponent('Erro ao criar cliente.'));
  }

  const { data: templateItems } = await supabase
    .from('onboarding_template_items')
    .select('*')
    .order('position', { ascending: true });

  if (templateItems && templateItems.length > 0) {
    const rows = templateItems.map((t: any) => ({
      client_id: client.id,
      position: t.position,
      done: false,
      label: t.label,
    }));
    await supabase.from('client_onboarding_items').insert(rows);
  }

  revalidatePath('/clientes');
  redirect(`/clientes/${client.id}?success=` + encodeURIComponent('Cliente criado com sucesso.'));
}

export async function updateClienteDados(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageClients(me.role)) {
    redirect(`/clientes/${clientId}?error=` + encodeURIComponent('Sem permissão.'));
  }

  const payload = fieldsFromDados(formData);
  if (!payload.name) {
    redirect(`/clientes/${clientId}?error=` + encodeURIComponent('Nome é obrigatório.'));
  }

  const { error } = await supabase.from('clients').update(payload).eq('id', clientId);
  if (error) {
    redirect(`/clientes/${clientId}?error=` + encodeURIComponent('Erro ao salvar.'));
  }

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?success=` + encodeURIComponent('Dados salvos.'));
}

export async function addClientService(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageClients(me.role)) {
    redirect(`/clientes/${clientId}?error=` + encodeURIComponent('Sem permissão.'));
  }

  const service = String(formData.get('service') ?? '');
  const monthlyValue = Number(formData.get('monthly_value') ?? 0);
  if (!service) {
    redirect(`/clientes/${clientId}?aba=servicos&error=` + encodeURIComponent('Selecione um serviço.'));
  }

  const { error } = await supabase.from('client_services').insert({
    client_id: clientId,
    service,
    monthly_value: monthlyValue,
    active: true,
  });
  if (error) {
    redirect(`/clientes/${clientId}?aba=servicos&error=` + encodeURIComponent('Erro ao adicionar serviço.'));
  }

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?aba=servicos&success=` + encodeURIComponent('Serviço adicionado.'));
}

export async function toggleClientService(
  clientId: string,
  serviceId: string,
  nextActive: boolean,
  _formData: FormData
) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageClients(me.role)) {
    redirect(`/clientes/${clientId}?error=` + encodeURIComponent('Sem permissão.'));
  }

  const { error } = await supabase
    .from('client_services')
    .update({ active: nextActive })
    .eq('id', serviceId);
  if (error) {
    redirect(`/clientes/${clientId}?aba=servicos&error=` + encodeURIComponent('Erro ao atualizar serviço.'));
  }

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?aba=servicos&success=` + encodeURIComponent('Serviço atualizado.'));
}

export async function removeClientService(
  clientId: string,
  serviceId: string,
  _formData: FormData
) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageClients(me.role)) {
    redirect(`/clientes/${clientId}?error=` + encodeURIComponent('Sem permissão.'));
  }

  const { error } = await supabase.from('client_services').delete().eq('id', serviceId);
  if (error) {
    redirect(`/clientes/${clientId}?aba=servicos&error=` + encodeURIComponent('Erro ao remover serviço.'));
  }

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?aba=servicos&success=` + encodeURIComponent('Serviço removido.'));
}

export async function upsertContract(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageClients(me.role)) {
    redirect(`/clientes/${clientId}?error=` + encodeURIComponent('Sem permissão.'));
  }

  const payload: Record<string, any> = {
    client_id: clientId,
    monthly_value: Number(formData.get('monthly_value') ?? 0),
    start_date: String(formData.get('start_date') ?? '') || null,
    due_day: Number(formData.get('due_day') ?? 0) || null,
    end_date: String(formData.get('end_date') ?? '') || null,
  };

  const file = formData.get('file') as File | null;
  if (file && file.size > 0) {
    const path = `${clientId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(path, file, { upsert: true });
    if (!uploadError) {
      payload.file_path = path;
    }
  }

  const { data: existing } = await supabase
    .from('contracts')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle();

  const { error: saveError } = existing
    ? await supabase.from('contracts').update(payload).eq('id', existing.id)
    : await supabase.from('contracts').insert(payload);

  if (saveError) {
    redirect(`/clientes/${clientId}?aba=contrato&error=` + encodeURIComponent('Erro ao salvar contrato.'));
  }

  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?aba=contrato&success=` + encodeURIComponent('Contrato salvo.'));
}

export async function addClientMetric(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) {
    redirect(`/clientes/${clientId}?error=` + encodeURIComponent('Sem permissão.'));
  }

  const mes = String(formData.get('reference_month') ?? '');

  const { error } = await supabase.from('client_metrics').insert({
    client_id: clientId,
    leads: Number(formData.get('leads') ?? 0),
    meta_ads_spend: Number(formData.get('meta_spend') ?? 0),
    reference_month: mes.length === 7 ? `${mes}-01` : mes,
  });

  if (error) {
    redirect(`/clientes/${clientId}?aba=metricas&error=` + encodeURIComponent('Erro ao salvar métrica.'));
  }

  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?aba=metricas&success=` + encodeURIComponent('Métrica adicionada.'));
}

export async function addClientNote(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) {
    redirect(`/clientes/${clientId}?error=` + encodeURIComponent('Sem permissão.'));
  }

  const content = String(formData.get('content') ?? '').trim();
  if (!content) {
    redirect(`/clientes/${clientId}?aba=anotacoes&error=` + encodeURIComponent('Nota vazia.'));
  }

  const { error } = await supabase.from('client_notes').insert({
    client_id: clientId,
    author_id: me.id,
    content,
  });
  if (error) {
    redirect(`/clientes/${clientId}?aba=anotacoes&error=` + encodeURIComponent('Erro ao salvar anotação.'));
  }

  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?aba=anotacoes&success=` + encodeURIComponent('Anotação adicionada.'));
}

export async function uploadClientFile(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) {
    redirect(`/clientes/${clientId}?error=` + encodeURIComponent('Sem permissão.'));
  }

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    redirect(`/clientes/${clientId}?aba=arquivos&error=` + encodeURIComponent('Selecione um arquivo.'));
  }

  const path = `${clientId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('client-files').upload(path, file);
  if (uploadError) {
    redirect(`/clientes/${clientId}?aba=arquivos&error=` + encodeURIComponent('Erro no upload.'));
  }

  const { error } = await supabase.from('client_files').insert({
    client_id: clientId,
    file_name: file.name,
    file_path: path,
    uploaded_by: me.id,
  });
  if (error) {
    redirect(`/clientes/${clientId}?aba=arquivos&error=` + encodeURIComponent('Erro ao salvar arquivo.'));
  }

  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?aba=arquivos&success=` + encodeURIComponent('Arquivo enviado.'));
}

export async function toggleOnboardingItem(
  clientId: string,
  itemId: string,
  nextDone: boolean,
  _formData: FormData
) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) {
    redirect(`/clientes/${clientId}?error=` + encodeURIComponent('Sem permissão.'));
  }

  const { error } = await supabase
    .from('client_onboarding_items')
    .update({ done: nextDone })
    .eq('id', itemId);
  if (error) {
    redirect(`/clientes/${clientId}?aba=onboarding&error=` + encodeURIComponent('Erro ao atualizar item.'));
  }

  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?aba=onboarding`);
}
