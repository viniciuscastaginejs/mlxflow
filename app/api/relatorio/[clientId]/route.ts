import { NextResponse, type NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canSeeFinanceiro } from '@/lib/auth/role';
import { RelatorioMensalPDF } from '@/lib/pdf/relatorio';

const SERVICE_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  landing_page: 'Landing Page',
  social_media: 'Social Media',
  consultoria: 'Consultoria',
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canSeeFinanceiro(me.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const formData = await request.formData();
  const mesAno = String(formData.get('mes') ?? ''); // YYYY-MM
  const [yearStr, monthStr] = mesAno.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) {
    return NextResponse.json({ error: 'Mês inválido.' }, { status: 400 });
  }

  const { data: client } = await supabase.from('clients').select('name').eq('id', clientId).maybeSingle();
  if (!client) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
  }

  const { data: servicosData } = await supabase
    .from('client_services')
    .select('service, monthly_value')
    .eq('client_id', clientId)
    .eq('active', true);

  const services = (servicosData ?? []).map((s: any) => ({
    label: SERVICE_LABELS[s.service] ?? s.service,
    monthlyValue: Number(s.monthly_value || 0),
  }));

  const { data: revenues } = await supabase
    .from('revenues')
    .select('id')
    .eq('client_id', clientId)
    .eq('year', year);
  const revenueIds = (revenues ?? []).map((r: any) => r.id);

  let totalPago = 0;
  if (revenueIds.length > 0) {
    const { data: installments } = await supabase
      .from('revenue_installments')
      .select('amount, status, month')
      .in('revenue_id', revenueIds)
      .eq('month', month)
      .eq('status', 'pago');
    totalPago = (installments ?? []).reduce((acc: number, i: any) => acc + Number(i.amount || 0), 0);
  }

  const referenceMonth = `${yearStr}-${monthStr.padStart(2, '0')}-01`;
  const { data: metrica } = await supabase
    .from('client_metrics')
    .select('leads, meta_ads_spend, cpl')
    .eq('client_id', clientId)
    .eq('reference_month', referenceMonth)
    .maybeSingle();

  const inicioMes = `${yearStr}-${monthStr.padStart(2, '0')}-01`;
  const fimMes = new Date(year, month, 0).toISOString().slice(0, 10);
  const { data: posts } = await supabase
    .from('editorial_posts')
    .select('caption, platform, status')
    .eq('client_id', clientId)
    .gte('scheduled_date', inicioMes)
    .lte('scheduled_date', fimMes);

  const date = new Date().toLocaleDateString('pt-BR');
  const buffer = await renderToBuffer(
    RelatorioMensalPDF({
      clientName: client.name,
      mesAno: `${monthStr.padStart(2, '0')}/${yearStr}`,
      services,
      totalPago,
      leads: metrica?.leads ?? 0,
      spend: Number(metrica?.meta_ads_spend ?? 0),
      cpl: metrica?.cpl ?? null,
      posts: (posts ?? []).map((p: any) => ({ caption: p.caption, platform: p.platform, status: p.status })),
      date,
    }) as any
  );

  const path = `relatorios/${clientId}/${yearStr}-${monthStr.padStart(2, '0')}.pdf`;
  await supabase.storage.from('documents').upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-${client.name}-${monthStr}-${yearStr}.pdf"`,
    },
  });
}
