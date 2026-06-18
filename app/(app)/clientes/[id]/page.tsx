import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  getCurrentUser,
  canManageClients,
  canSeeFinanceiro,
  isReadOnly,
} from '@/lib/auth/role';
import {
  getClienteDetalhe,
  getClientServices,
  getContract,
  getClienteFinanceiro,
  getClientMetrics,
  getClientNotes,
  getClientFiles,
  getOnboardingItems,
  type ServiceType,
} from '@/lib/queries/cliente-detalhe';
import { getResponsaveis, STATUS_LABEL, STATUS_PILL } from '@/lib/queries/clientes';
import { getClientPosts, type Platform } from '@/lib/queries/editorial';
import { brl, num, dataCurta } from '@/lib/format';
import Notify from '../../_notify';
import { CheckIcon } from '../../_icons';
import CalendarioTab from '../_calendario-tab';
import {
  updateClienteDados,
  addClientService,
  toggleClientService,
  removeClientService,
  upsertContract,
  addClientMetric,
  addClientNote,
  uploadClientFile,
  toggleOnboardingItem,
} from '../actions';

export const dynamic = 'force-dynamic';

const SERVICE_LABEL: Record<ServiceType, string> = {
  meta_ads: 'Meta Ads',
  landing_page: 'Landing Page',
  social_media: 'Social Media',
  consultoria: 'Consultoria',
};

type Aba =
  | 'dados'
  | 'servicos'
  | 'contrato'
  | 'financeiro'
  | 'metricas'
  | 'anotacoes'
  | 'arquivos'
  | 'onboarding'
  | 'calendario';

export default async function ClienteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    aba?: string;
    visao?: string;
    mes?: string;
    semana?: string;
    platform?: string;
    modal?: string;
    editar?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { aba } = sp;
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  const podeGerenciar = canManageClients(me.role);
  const podeVerFinanceiro = canSeeFinanceiro(me.role);
  const somenteLeitura = isReadOnly(me.role);

  const [cliente, servicos, contrato, metricas, notas, arquivos, onboarding, responsaveis, posts] =
    await Promise.all([
      getClienteDetalhe(supabase, id),
      getClientServices(supabase, id),
      getContract(supabase, id),
      getClientMetrics(supabase, id),
      getClientNotes(supabase, id),
      getClientFiles(supabase, id),
      getOnboardingItems(supabase, id),
      getResponsaveis(supabase),
      getClientPosts(supabase, id, { platform: sp.platform as Platform | undefined }),
    ]);

  if (!cliente) {
    redirect('/clientes');
  }

  const financeiro = podeVerFinanceiro ? await getClienteFinanceiro(supabase, id) : null;

  let contratoUrl: string | null = null;
  if (contrato?.filePath) {
    const { data } = await supabase.storage
      .from('contracts')
      .createSignedUrl(contrato.filePath, 3600);
    contratoUrl = data?.signedUrl ?? null;
  }

  const arquivosComUrl = await Promise.all(
    arquivos.map(async (f) => {
      const { data } = await supabase.storage.from('client-files').createSignedUrl(f.filePath, 3600);
      return { ...f, url: data?.signedUrl ?? null };
    })
  );

  const postsComUrl = await Promise.all(
    posts.map(async (p) => {
      if (!p.artPath) return { ...p, url: null };
      const { data } = await supabase.storage.from('post-art').createSignedUrl(p.artPath, 3600);
      return { ...p, url: data?.signedUrl ?? null };
    })
  );

  const host = (await headers()).get('host') ?? 'localhost:3000';
  const origin = `${host.includes('localhost') ? 'http' : 'https'}://${host}`;

  const hojeISO = new Date().toISOString().slice(0, 10);
  const visao: 'mensal' | 'semanal' = sp.visao === 'semanal' ? 'semanal' : 'mensal';
  const mes = sp.mes ?? hojeISO.slice(0, 7);
  const semana = sp.semana ?? hojeISO;

  const abaAtual: Aba = (aba as Aba) ?? 'dados';

  const TABS: { key: Aba; label: string; show: boolean }[] = [
    { key: 'dados', label: 'Dados', show: true },
    { key: 'servicos', label: 'Serviços', show: true },
    { key: 'contrato', label: 'Contrato', show: true },
    { key: 'financeiro', label: 'Financeiro', show: podeVerFinanceiro },
    { key: 'metricas', label: 'Métricas', show: true },
    { key: 'calendario', label: 'Calendário', show: true },
    { key: 'anotacoes', label: 'Anotações', show: true },
    { key: 'arquivos', label: 'Arquivos', show: true },
    { key: 'onboarding', label: 'Onboarding', show: true },
  ];

  return (
    <>
      <Notify />

      <div className="page-head">
        <div>
          <h1 className="page-title">{cliente.name}</h1>
          <p className="page-sub">
            {cliente.nicho ?? 'Sem nicho'} ·{' '}
            <span className={`pill ${STATUS_PILL[cliente.status]}`}>
              {STATUS_LABEL[cliente.status]}
            </span>
          </p>
        </div>
        <Link href="/clientes" className="btn--secondary btn--sm">
          Voltar
        </Link>
      </div>

      <div className="tabs">
        {TABS.filter((t) => t.show).map((t) => (
          <Link
            key={t.key}
            href={`/clientes/${id}?aba=${t.key}`}
            className={`tab${abaAtual === t.key ? ' is-active' : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {abaAtual === 'dados' && (
        <div className="card">
          <h2 className="card-title">Dados</h2>
          {somenteLeitura ? (
            <DadosSomenteLeitura cliente={cliente} responsaveis={responsaveis} />
          ) : (
            <form action={updateClienteDados.bind(null, id)}>
              <div className="field-row-lt">
                <div className="field-lt">
                  <label htmlFor="name">Empresa</label>
                  <input id="name" name="name" type="text" defaultValue={cliente.name} required />
                </div>
                <div className="field-lt">
                  <label htmlFor="nicho">Nicho</label>
                  <input id="nicho" name="nicho" type="text" defaultValue={cliente.nicho ?? ''} />
                </div>
              </div>
              <div className="field-row-lt">
                <div className="field-lt">
                  <label htmlFor="contact_name">Contato</label>
                  <input
                    id="contact_name"
                    name="contact_name"
                    type="text"
                    defaultValue={cliente.contactName ?? ''}
                  />
                </div>
                <div className="field-lt">
                  <label htmlFor="contact_email">Email</label>
                  <input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    defaultValue={cliente.contactEmail ?? ''}
                  />
                </div>
              </div>
              <div className="field-row-lt">
                <div className="field-lt">
                  <label htmlFor="phone">Telefone</label>
                  <input id="phone" name="phone" type="text" defaultValue={cliente.phone ?? ''} />
                </div>
                <div className="field-lt">
                  <label htmlFor="whatsapp">WhatsApp</label>
                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="text"
                    defaultValue={cliente.whatsapp ?? ''}
                  />
                </div>
              </div>
              <div className="field-row-lt">
                <div className="field-lt">
                  <label htmlFor="instagram">Instagram</label>
                  <input
                    id="instagram"
                    name="instagram"
                    type="text"
                    defaultValue={cliente.instagram ?? ''}
                  />
                </div>
                <div className="field-lt">
                  <label htmlFor="status">Status</label>
                  <select id="status" name="status" defaultValue={cliente.status}>
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field-lt">
                <label htmlFor="responsible_id">Responsável</label>
                <select
                  id="responsible_id"
                  name="responsible_id"
                  defaultValue={cliente.responsibleId ?? ''}
                  disabled={!podeGerenciar}
                >
                  <option value="">Sem responsável</option>
                  {responsaveis.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn--inline">
                Salvar
              </button>
            </form>
          )}
        </div>
      )}

      {abaAtual === 'servicos' && (
        <div className="stack">
          {!somenteLeitura && (
            <div className="card">
              <h2 className="card-title">Adicionar serviço</h2>
              <form action={addClientService.bind(null, id)} className="field-row-lt">
                <div className="field-lt">
                  <label htmlFor="service">Serviço</label>
                  <select id="service" name="service" defaultValue="meta_ads">
                    {Object.entries(SERVICE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-lt">
                  <label htmlFor="monthly_value">Valor mensal</label>
                  <input id="monthly_value" name="monthly_value" type="number" step="0.01" min="0" />
                </div>
                <div className="field-lt" style={{ alignSelf: 'flex-end' }}>
                  <button type="submit" className="btn btn--inline">
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card">
            <h2 className="card-title">Serviços contratados</h2>
            {servicos.length === 0 ? (
              <p className="empty">Nenhum serviço contratado ainda.</p>
            ) : (
              servicos.map((s) => (
                <div className="list-row" key={s.id}>
                  <div>
                    <div className="lr-main">{SERVICE_LABEL[s.service]}</div>
                    <div className="lr-sub">{brl(s.monthlyValue)}/mês</div>
                  </div>
                  <div className="file-actions">
                    {!somenteLeitura && podeGerenciar ? (
                      <>
                        <form action={toggleClientService.bind(null, id, s.id, !s.active)}>
                          <button
                            type="submit"
                            className={`toggle${s.active ? ' is-on' : ''}`}
                            aria-label="Ativo"
                          />
                        </form>
                        <form action={removeClientService.bind(null, id, s.id)}>
                          <button type="submit" className="btn--secondary btn--sm">
                            Remover
                          </button>
                        </form>
                      </>
                    ) : (
                      <span className={`pill ${s.active ? 'pill--ok' : 'pill--danger'}`}>
                        {s.active ? 'Ativo' : 'Inativo'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {abaAtual === 'contrato' && (
        <div className="card">
          <h2 className="card-title">Contrato</h2>
          {!somenteLeitura && podeGerenciar && (
            <form action={upsertContract.bind(null, id)}>
              <div className="field-row-lt">
                <div className="field-lt">
                  <label htmlFor="contract_monthly_value">Valor mensal</label>
                  <input
                    id="contract_monthly_value"
                    name="monthly_value"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={contrato?.monthlyValue ?? ''}
                  />
                </div>
                <div className="field-lt">
                  <label htmlFor="due_day">Dia de vencimento</label>
                  <input
                    id="due_day"
                    name="due_day"
                    type="number"
                    min="1"
                    max="31"
                    defaultValue={contrato?.dueDay ?? ''}
                  />
                </div>
              </div>
              <div className="field-row-lt">
                <div className="field-lt">
                  <label htmlFor="start_date">Data início</label>
                  <input
                    id="start_date"
                    name="start_date"
                    type="date"
                    defaultValue={contrato?.startDate ?? ''}
                  />
                </div>
                <div className="field-lt">
                  <label htmlFor="end_date">Data fim</label>
                  <input
                    id="end_date"
                    name="end_date"
                    type="date"
                    defaultValue={contrato?.endDate ?? ''}
                  />
                </div>
              </div>
              <div className="field-lt">
                <label htmlFor="file">Contrato em PDF</label>
                <input id="file" name="file" type="file" accept="application/pdf" />
              </div>
              <button type="submit" className="btn btn--inline">
                Salvar contrato
              </button>
            </form>
          )}

          {contrato && (
            <div className="file-row">
              <div>
                <div className="file-name">Contrato atual</div>
                <div className="file-meta">
                  {contrato.startDate ? dataCurta(contrato.startDate) : '—'} até{' '}
                  {contrato.endDate ? dataCurta(contrato.endDate) : '—'} · {brl(contrato.monthlyValue)}/mês
                </div>
              </div>
              {contratoUrl && (
                <a href={contratoUrl} target="_blank" rel="noreferrer" className="file-link">
                  Abrir PDF
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {abaAtual === 'financeiro' && podeVerFinanceiro && (
        <div className="stack">
          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi-label">Total pago</div>
              <div className="kpi-value">{brl(financeiro?.totalPago ?? 0)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Total em aberto</div>
              <div className="kpi-value">{brl(financeiro?.totalEmAberto ?? 0)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Total no ano</div>
              <div className="kpi-value">{brl(financeiro?.totalAno ?? 0)}</div>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Relatório mensal em PDF</h2>
            <form action={`/api/relatorio/${id}`} method="post" className="field-row-lt">
              <div className="field-lt">
                <label htmlFor="mes-relatorio">Mês</label>
                <input id="mes-relatorio" name="mes" type="month" required />
              </div>
              <div className="field-lt" style={{ alignSelf: 'flex-end' }}>
                <button type="submit" className="btn btn--inline">
                  Gerar PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {abaAtual === 'metricas' && (
        <div className="stack">
          {!somenteLeitura && (
            <div className="card">
              <h2 className="card-title">Adicionar métrica</h2>
              <form action={addClientMetric.bind(null, id)} className="field-row-lt">
                <div className="field-lt">
                  <label htmlFor="reference_month">Mês</label>
                  <input id="reference_month" name="reference_month" type="month" required />
                </div>
                <div className="field-lt">
                  <label htmlFor="meta_spend">Gasto Meta Ads</label>
                  <input id="meta_spend" name="meta_spend" type="number" step="0.01" min="0" />
                </div>
                <div className="field-lt">
                  <label htmlFor="leads">Leads</label>
                  <input id="leads" name="leads" type="number" min="0" />
                </div>
                <div className="field-lt" style={{ alignSelf: 'flex-end' }}>
                  <button type="submit" className="btn btn--inline">
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card">
            <h2 className="card-title">Histórico</h2>
            {metricas.length === 0 ? (
              <p className="empty">Nenhuma métrica registrada ainda.</p>
            ) : (
              metricas.map((m) => (
                <div className="list-row" key={m.id}>
                  <div>
                    <div className="lr-main">{m.referenceMonth}</div>
                    <div className="lr-sub">{num(m.leads)} leads</div>
                  </div>
                  <div className="lr-right">
                    <div className="lr-main">{brl(m.spend)}</div>
                    <div className="lr-sub">CPL {m.cpl != null ? brl(m.cpl) : '—'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {abaAtual === 'anotacoes' && (
        <div className="stack">
          {!somenteLeitura && (
            <div className="card">
              <h2 className="card-title">Nova anotação</h2>
              <form action={addClientNote.bind(null, id)}>
                <div className="field-lt">
                  <textarea name="content" placeholder="Escreva uma anotação..." required />
                </div>
                <button type="submit" className="btn btn--inline">
                  Adicionar
                </button>
              </form>
            </div>
          )}

          <div className="card">
            <h2 className="card-title">Histórico</h2>
            {notas.length === 0 ? (
              <p className="empty">Nenhuma anotação ainda.</p>
            ) : (
              notas.map((n) => (
                <div className="act" key={n.id}>
                  <span className="act-dot" />
                  <div>
                    <div className="act-text">
                      <b>{n.authorName ?? 'Alguém'}</b>: {n.content}
                    </div>
                    <div className="act-time">{dataCurta(n.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {abaAtual === 'arquivos' && (
        <div className="stack">
          {!somenteLeitura && (
            <div className="card">
              <h2 className="card-title">Enviar arquivo</h2>
              <form action={uploadClientFile.bind(null, id)}>
                <div className="field-lt">
                  <input name="file" type="file" required />
                </div>
                <button type="submit" className="btn btn--inline">
                  Enviar
                </button>
              </form>
            </div>
          )}

          <div className="card">
            <h2 className="card-title">Arquivos</h2>
            {arquivosComUrl.length === 0 ? (
              <p className="empty">Nenhum arquivo ainda.</p>
            ) : (
              arquivosComUrl.map((f) => (
                <div className="file-row" key={f.id}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="file-ic">▤</span>
                    <div>
                      <div className="file-name">{f.fileName}</div>
                      <div className="file-meta">
                        {f.uploadedByName ?? 'Alguém'} · {dataCurta(f.createdAt)}
                      </div>
                    </div>
                  </div>
                  {f.url && (
                    <a href={f.url} target="_blank" rel="noreferrer" className="file-link">
                      Baixar
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {abaAtual === 'calendario' && (
        <CalendarioTab
          clientId={id}
          posts={postsComUrl}
          platformFilter={sp.platform as Platform | undefined}
          visao={visao}
          mes={mes}
          semana={semana}
          modal={sp.modal === 'novo' ? 'novo' : null}
          editId={sp.editar ?? null}
          readOnly={somenteLeitura}
          origin={origin}
        />
      )}

      {abaAtual === 'onboarding' && (
        <div className="card">
          <h2 className="card-title">Onboarding</h2>
          {onboarding.length === 0 ? (
            <p className="empty">Nenhum item de onboarding.</p>
          ) : (
            onboarding.map((o) => (
              <div className={`checklist-row${o.done ? ' is-done' : ''}`} key={o.id}>
                {somenteLeitura ? (
                  <span className={`checklist-check${o.done ? ' is-done' : ''}`}>
                    {o.done ? <CheckIcon /> : ''}
                  </span>
                ) : (
                  <form action={toggleOnboardingItem.bind(null, id, o.id, !o.done)}>
                    <button
                      type="submit"
                      className={`checklist-check${o.done ? ' is-done' : ''}`}
                    >
                      {o.done ? <CheckIcon /> : ''}
                    </button>
                  </form>
                )}
                <span className="checklist-label">{o.label}</span>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

function DadosSomenteLeitura({
  cliente,
  responsaveis,
}: {
  cliente: { contactName: string | null; contactEmail: string | null; phone: string | null; whatsapp: string | null; instagram: string | null; responsibleId: string | null };
  responsaveis: { id: string; name: string }[];
}) {
  const responsavel = responsaveis.find((r) => r.id === cliente.responsibleId);
  return (
    <div className="stack">
      <div className="list-row">
        <div className="lr-main">Contato</div>
        <div className="lr-sub">{cliente.contactName ?? '—'}</div>
      </div>
      <div className="list-row">
        <div className="lr-main">Email</div>
        <div className="lr-sub">{cliente.contactEmail ?? '—'}</div>
      </div>
      <div className="list-row">
        <div className="lr-main">Telefone</div>
        <div className="lr-sub">{cliente.phone ?? '—'}</div>
      </div>
      <div className="list-row">
        <div className="lr-main">WhatsApp</div>
        <div className="lr-sub">{cliente.whatsapp ?? '—'}</div>
      </div>
      <div className="list-row">
        <div className="lr-main">Instagram</div>
        <div className="lr-sub">{cliente.instagram ?? '—'}</div>
      </div>
      <div className="list-row">
        <div className="lr-main">Responsável</div>
        <div className="lr-sub">{responsavel?.name ?? 'Sem responsável'}</div>
      </div>
    </div>
  );
}
