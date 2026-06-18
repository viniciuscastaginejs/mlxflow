import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canManageFinanceiro } from '@/lib/auth/role';
import Notify from '../../_notify';
import { saveMonthlyGoal } from './actions';

export const dynamic = 'force-dynamic';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageFinanceiro(me.role)) {
    redirect('/dashboard');
  }

  const hoje = new Date();
  const { ano, mes } = await searchParams;
  const year = Number(ano) || hoje.getFullYear();
  const month = Number(mes) || hoje.getMonth() + 1;

  const { data: meta } = await supabase
    .from('monthly_goals')
    .select('mrr_goal, clients_goal, revenue_goal')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  const anos = Array.from({ length: 4 }, (_, i) => hoje.getFullYear() + 1 - i);

  return (
    <>
      <Notify />

      <h1 className="page-title">Metas mensais</h1>
      <p className="page-sub">Define as metas usadas no progresso do dashboard</p>

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
        <div className="field-lt">
          <label htmlFor="mes">Mês</label>
          <select id="mes" name="mes" defaultValue={String(month)}>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn--inline btn--sm">
          Ver
        </button>
      </form>

      <div className="card" style={{ maxWidth: 480 }}>
        <h2 className="card-title">
          Meta de {MESES[month - 1]} de {year}
        </h2>
        <form action={saveMonthlyGoal}>
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <div className="field-lt">
            <label htmlFor="mrr_goal">Meta de MRR</label>
            <input
              id="mrr_goal"
              name="mrr_goal"
              type="number"
              step="0.01"
              min="0"
              defaultValue={meta?.mrr_goal ?? ''}
            />
          </div>
          <div className="field-lt">
            <label htmlFor="clients_goal">Meta de clientes ativos</label>
            <input
              id="clients_goal"
              name="clients_goal"
              type="number"
              min="0"
              defaultValue={meta?.clients_goal ?? ''}
            />
          </div>
          <div className="field-lt">
            <label htmlFor="revenue_goal">Meta de receita do mês</label>
            <input
              id="revenue_goal"
              name="revenue_goal"
              type="number"
              step="0.01"
              min="0"
              defaultValue={meta?.revenue_goal ?? ''}
            />
          </div>
          <button type="submit" className="btn btn--inline">
            Salvar meta
          </button>
        </form>
      </div>
    </>
  );
}
