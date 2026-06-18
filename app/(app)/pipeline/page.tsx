import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, isReadOnly } from '@/lib/auth/role';
import { getDeals, taxaConversao } from '@/lib/queries/pipeline';
import { getClientesOptions, getResponsaveis } from '@/lib/queries/clientes';
import { pct } from '@/lib/format';
import Board from './_board';

export const dynamic = 'force-dynamic';

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ responsavel?: string }>;
}) {
  const { responsavel } = await searchParams;
  const supabase = await createClient();
  const me = await getCurrentUser();

  const [deals, clientes, responsaveis] = await Promise.all([
    getDeals(supabase, { responsibleId: responsavel }),
    getClientesOptions(supabase),
    getResponsaveis(supabase),
  ]);

  const conversao = taxaConversao(deals);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Pipeline Comercial</h1>
          <p className="page-sub">Funil de negociações</p>
        </div>
        <div className="kpi" style={{ padding: '10px 18px' }}>
          <div className="kpi-label">Taxa de conversão</div>
          <div className="kpi-value">{pct(conversao)}</div>
          <div className="kpi-sub">Fechados ÷ total</div>
        </div>
      </div>

      <form method="get" className="filters">
        <div className="field-lt">
          <label htmlFor="responsavel">Responsável</label>
          <select id="responsavel" name="responsavel" defaultValue={responsavel ?? ''}>
            <option value="">Todos</option>
            {responsaveis.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn--inline btn--sm">
          Filtrar
        </button>
      </form>

      <Board
        initialDeals={deals}
        clientes={clientes}
        responsaveis={responsaveis}
        readOnly={isReadOnly(me.role)}
      />
    </>
  );
}
