import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canManageFinanceiro } from '@/lib/auth/role';
import { getPropostas } from '@/lib/queries/propostas';
import { getClientesOptions } from '@/lib/queries/clientes';
import { brl, dataCurta } from '@/lib/format';
import Notify from '../_notify';
import { CloseIcon } from '../_icons';
import { createProposta } from './actions';

export const dynamic = 'force-dynamic';

const SERVICE_FIELDS = [
  { key: 'meta_ads', label: 'Meta Ads' },
  { key: 'landing_page', label: 'Landing Page' },
  { key: 'social_media', label: 'Social Media' },
  { key: 'consultoria', label: 'Consultoria' },
];

export default async function PropostasPage({
  searchParams,
}: {
  searchParams: Promise<{ modal?: string }>;
}) {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (!canManageFinanceiro(me.role)) {
    redirect('/dashboard');
  }

  const { modal } = await searchParams;
  const [propostas, clientes] = await Promise.all([getPropostas(supabase), getClientesOptions(supabase)]);

  const propostasComUrl = await Promise.all(
    propostas.map(async (p) => {
      if (!p.filePath) return { ...p, url: null };
      const { data } = await supabase.storage.from('documents').createSignedUrl(p.filePath, 3600);
      return { ...p, url: data?.signedUrl ?? null };
    })
  );

  return (
    <>
      <Notify />

      <div className="page-head">
        <div>
          <h1 className="page-title">Propostas</h1>
          <p className="page-sub">Gerador de proposta comercial em PDF</p>
        </div>
        <Link href="/propostas?modal=novo" className="btn btn--inline">
          Nova proposta
        </Link>
      </div>

      <div className="card">
        {propostasComUrl.length === 0 ? (
          <p className="empty">Nenhuma proposta gerada ainda.</p>
        ) : (
          propostasComUrl.map((p) => (
            <div className="list-row" key={p.id}>
              <div>
                <div className="lr-main">{p.companyName}</div>
                <div className="lr-sub">
                  {p.contactName ?? 'Sem contato'} · {dataCurta(p.createdAt)}
                </div>
              </div>
              <div className="lr-right">
                <div className="lr-main">{brl(p.planValue)}/mês</div>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" className="file-link">
                    Baixar PDF
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {modal === 'novo' && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h2>Nova proposta</h2>
              <Link href="/propostas" className="modal-close">
                <CloseIcon />
              </Link>
            </div>
            <form action={createProposta}>
              <div className="field-row-lt">
                <div className="field-lt">
                  <label htmlFor="company_name">Empresa</label>
                  <input id="company_name" name="company_name" type="text" required />
                </div>
                <div className="field-lt">
                  <label htmlFor="contact_name">Contato</label>
                  <input id="contact_name" name="contact_name" type="text" />
                </div>
              </div>

              <div className="field-lt">
                <label htmlFor="client_id">Cliente vinculado (opcional)</label>
                <select id="client_id" name="client_id" defaultValue="">
                  <option value="">Nenhum</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-lt">
                <label>Serviços e valores</label>
                {SERVICE_FIELDS.map((s) => (
                  <div className="field-row-lt" key={s.key} style={{ marginBottom: 8 }}>
                    <span className="grid-label-main" style={{ alignSelf: 'center' }}>
                      {s.label}
                    </span>
                    <input name={`service_${s.key}`} type="number" step="0.01" min="0" placeholder="0,00" />
                  </div>
                ))}
              </div>

              <div className="field-lt">
                <label htmlFor="plan_value">Valor do plano</label>
                <input id="plan_value" name="plan_value" type="number" step="0.01" min="0" required />
              </div>

              <button type="submit" className="btn btn--inline">
                Gerar PDF
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
