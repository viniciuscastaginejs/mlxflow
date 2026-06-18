'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canManageFinanceiro } from '@/lib/auth/role';
import { PropostaPDF, type PropostaServico } from '@/lib/pdf/proposta';

const SERVICE_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  landing_page: 'Landing Page',
  social_media: 'Social Media',
  consultoria: 'Consultoria',
};

export async function createProposta(formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageFinanceiro(me.role)) {
    redirect('/propostas?error=' + encodeURIComponent('Sem permissão.'));
  }

  const companyName = String(formData.get('company_name') ?? '').trim();
  const contactName = String(formData.get('contact_name') ?? '').trim() || null;
  const clientId = String(formData.get('client_id') ?? '') || null;
  const planValue = Number(formData.get('plan_value') ?? 0);

  if (!companyName) {
    redirect('/propostas?error=' + encodeURIComponent('Empresa é obrigatória.'));
  }

  const services: PropostaServico[] = [];
  for (const key of Object.keys(SERVICE_LABELS)) {
    const value = Number(formData.get(`service_${key}`) ?? 0);
    if (value > 0) services.push({ service: SERVICE_LABELS[key], value });
  }

  const date = new Date().toLocaleDateString('pt-BR');
  const buffer = await renderToBuffer(
    PropostaPDF({ companyName, contactName, services, planValue, date }) as any
  );

  const path = `propostas/${Date.now()}-${companyName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.pdf`;
  const { error: uploadError } = await supabase.storage.from('documents').upload(path, buffer, {
    contentType: 'application/pdf',
  });

  if (uploadError) {
    redirect('/propostas?error=' + encodeURIComponent(`Erro ao salvar PDF: ${uploadError.message}`));
  }

  const { error } = await supabase.from('proposals').insert({
    client_id: clientId,
    company_name: companyName,
    contact_name: contactName,
    services,
    plan_value: planValue,
    file_path: path,
    created_by: me.id,
  });

  if (error) {
    redirect('/propostas?error=' + encodeURIComponent(`Erro ao salvar proposta: ${error.message}`));
  }

  revalidatePath('/propostas');
  redirect('/propostas?success=' + encodeURIComponent('Proposta gerada.'));
}
