import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/queries/dashboard';
import { brl, num, dataCurta } from '@/lib/format';

// sempre dados frescos
export const dynamic = 'force-dynamic';

function progresso(valor: number, meta: number) {
  return meta > 0 ? Math.min(100, Math.round((valor / meta) * 100)) : 0;
}

const TABELA_LABEL: Record<string, string> = {
  clients: 'um cliente',
  client_services: 'um serviço',
  contracts: 'um contrato',
  editorial_posts: 'um post',
  revenues: 'uma receita',
  revenue_installments: 'uma parcela',
  expenses: 'uma despesa',
  partner_payments: 'um parceiro',
  pipeline_deals: 'uma negociação',
  tasks: 'uma tarefa',
  proposals: 'uma proposta',
};
const ACAO_LABEL: Record<string, string> = {
  insert: 'criou',
  update: 'atualizou',
  delete: 'removeu',
};

function tempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d}d`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const data = await getDashboardData(supabase);

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Visão geral da agência</p>

      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">MRR atual</div>
          <div className="kpi-value">{brl(data.mrr)}</div>
          <div className="kpi-sub">Receita recorrente mensal</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Clientes ativos</div>
          <div className="kpi-value">{num(data.clientesAtivos)}</div>
          <div className="kpi-sub">Em operação</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Tarefas atrasadas</div>
          <div
            className={`kpi-value${data.tarefasAtrasadas > 0 ? ' is-alert' : ''}`}
          >
            {num(data.tarefasAtrasadas)}
          </div>
          <div className="kpi-sub">Prazo vencido</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Leads no pipeline</div>
          <div className="kpi-value">{num(data.pipeline.quantidade)}</div>
          <div className="kpi-sub">
            {brl(data.pipeline.valorEstimado)} estimados
          </div>
        </div>
      </section>

      <section className="cols">
        <div className="stack">
          <div className="card goals">
            <h2 className="card-title">Metas do mês</h2>
            {data.metas ? (
              <>
                <Meta
                  nome="MRR"
                  valor={data.mrr}
                  meta={data.metas.mrrMeta}
                  fmt={brl}
                />
                <Meta
                  nome="Clientes ativos"
                  valor={data.clientesAtivos}
                  meta={data.metas.clientesMeta}
                  fmt={num}
                />
                <Meta
                  nome="Receita"
                  valor={data.metas.receitaRealizada}
                  meta={data.metas.receitaMeta}
                  fmt={brl}
                />
              </>
            ) : (
              <p className="empty">
                Nenhuma meta definida para este mês. Cadastre em Configurações.
              </p>
            )}
          </div>

          <div className="card">
            <h2 className="card-title">Próximos vencimentos</h2>
            {data.vencimentos.length === 0 ? (
              <p className="empty">Nada a vencer por enquanto.</p>
            ) : (
              data.vencimentos.map((v, i) => (
                <div className="list-row" key={i}>
                  <div>
                    <div className="lr-main">{v.cliente}</div>
                    <div className="lr-sub">{dataCurta(v.vencimento)}</div>
                  </div>
                  <div className="lr-right">
                    <div className="lr-main">{brl(v.valor)}</div>
                    <span
                      className={`pill ${
                        v.status === 'atrasado' ? 'pill--danger' : 'pill--warn'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Últimas atividades da equipe</h2>
          {data.atividades.length === 0 ? (
            <p className="empty">Sem atividades registradas ainda.</p>
          ) : (
            data.atividades.map((a) => (
              <div className="act" key={a.id}>
                <span className="act-dot" />
                <div>
                  <div className="act-text">
                    <b>{a.actorEmail ?? 'Alguém'}</b>{' '}
                    {ACAO_LABEL[a.action] ?? a.action}{' '}
                    {TABELA_LABEL[a.table] ?? a.table}
                  </div>
                  <div className="act-time">{tempoRelativo(a.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

function Meta({
  nome,
  valor,
  meta,
  fmt,
}: {
  nome: string;
  valor: number;
  meta: number;
  fmt: (n: number) => string;
}) {
  const p = progresso(valor, meta);
  return (
    <div className="goal-row">
      <div className="goal-head">
        <span className="goal-name">{nome}</span>
        <span className="goal-vals">
          <b>{fmt(valor)}</b> / {fmt(meta)} · {p}%
        </span>
      </div>
      <div className="goal-bar">
        <div className="goal-fill" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
