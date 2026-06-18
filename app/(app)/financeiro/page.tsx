import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canSeeFinanceiro, canManageFinanceiro } from '@/lib/auth/role';
import { getFinanceiroAno } from '@/lib/queries/financeiro';
import { getClientesOptions } from '@/lib/queries/clientes';
import { brl } from '@/lib/format';
import FinanceiroClient from './_financeiro-client';

export const dynamic = 'force-dynamic';

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canSeeFinanceiro(me.role)) {
    redirect('/dashboard');
  }

  const { ano } = await searchParams;
  const anoAtual = new Date().getFullYear();
  const year = Number(ano) || anoAtual;

  const [dados, clientes] = await Promise.all([
    getFinanceiroAno(supabase, year),
    getClientesOptions(supabase),
  ]);

  const anos = Array.from({ length: 6 }, (_, i) => anoAtual + 1 - i);

  const receitaAno = dados.monthlyTotals.reduce((a, m) => a + m.receita, 0);
  const despesaAno = dados.monthlyTotals.reduce((a, m) => a + m.despesa + m.parceiros, 0);
  const lucroAno = dados.monthlyTotals.reduce((a, m) => a + m.lucroLiquido, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-sub">Receita, despesas e parceiros por ano</p>
        </div>
      </div>

      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">MRR atual</div>
          <div className="kpi-value">{brl(dados.mrr)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Receita anual ({year})</div>
          <div className="kpi-value">{brl(receitaAno)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Gasto anual ({year})</div>
          <div className="kpi-value">{brl(despesaAno)}</div>
          <div className="kpi-sub">Despesas + parceiros</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Lucro líquido anual ({year})</div>
          <div className={`kpi-value${lucroAno < 0 ? ' is-alert' : ''}`}>{brl(lucroAno)}</div>
        </div>
      </section>

      <form method="get" className="filters">
        <div className="field-lt">
          <label htmlFor="ano">Ano</label>
          <select id="ano" name="ano" defaultValue={String(year)}>
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn--inline btn--sm">
          Ver
        </button>
      </form>

      <FinanceiroClient
        year={year}
        revenues={dados.revenues}
        expenses={dados.expenses}
        partners={dados.partners}
        monthlyTotals={dados.monthlyTotals}
        clientes={clientes}
        canManage={canManageFinanceiro(me.role)}
      />
    </>
  );
}
