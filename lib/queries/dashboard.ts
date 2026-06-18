import type { SupabaseClient } from '@supabase/supabase-js';

export type AtividadeRecente = {
  id: string;
  actorEmail: string | null;
  action: string;
  table: string;
  createdAt: string;
};

export type Vencimento = {
  cliente: string;
  valor: number;
  status: string;
  vencimento: string; // ISO
};

export type DashboardData = {
  mrr: number;
  clientesAtivos: number;
  tarefasAtrasadas: number;
  pipeline: { quantidade: number; valorEstimado: number };
  metas: {
    mrrMeta: number;
    clientesMeta: number;
    receitaMeta: number;
    receitaRealizada: number;
  } | null;
  vencimentos: Vencimento[];
  atividades: AtividadeRecente[];
};

// Busca tudo que o dashboard precisa, em paralelo.
export async function getDashboardData(
  supabase: SupabaseClient
): Promise<DashboardData> {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1; // 1..12
  const hojeISO = hoje.toISOString().slice(0, 10);

  const [
    mrrRes,
    clientesRes,
    tarefasRes,
    pipelineRes,
    metaRes,
    receitaMesRes,
    vencRes,
    atividadeRes,
  ] = await Promise.all([
    // MRR (view)
    supabase.from('v_mrr').select('mrr').single(),

    // clientes ativos
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ativo'),

    // tarefas atrasadas (prazo no passado e não concluídas)
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .lt('due_date', hojeISO)
      .neq('status', 'concluido'),

    // leads no pipeline (fora de fechado/perdido)
    supabase
      .from('pipeline_deals')
      .select('estimated_value')
      .not('stage', 'in', '(fechado,perdido)'),

    // meta do mês corrente
    supabase
      .from('monthly_goals')
      .select('mrr_goal, clients_goal, revenue_goal')
      .eq('year', ano)
      .eq('month', mes)
      .maybeSingle(),

    // receita realizada do mês (view)
    supabase
      .from('v_monthly_revenue')
      .select('total')
      .eq('year', ano)
      .eq('month', mes)
      .maybeSingle(),

    // próximos vencimentos pendentes/atrasados a partir do mês atual
    supabase
      .from('revenue_installments')
      .select(
        'amount, status, month, revenues!inner(year, due_day, clients(name))'
      )
      .eq('revenues.year', ano)
      .gte('month', mes)
      .in('status', ['pendente', 'atrasado'])
      .order('month', { ascending: true })
      .limit(20),

    // últimas atividades da equipe (auditoria)
    supabase
      .from('audit_logs')
      .select('id, actor_email, action, table_name, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  // pipeline -> soma do valor estimado
  const pipelineRows = (pipelineRes.data ?? []) as { estimated_value: number }[];
  const valorEstimado = pipelineRows.reduce(
    (acc, r) => acc + Number(r.estimated_value || 0),
    0
  );

  // vencimentos -> calcula a data real (ano/mês/dia) e pega os 6 mais próximos
  const vencimentos: Vencimento[] = ((vencRes.data ?? []) as any[])
    .map((row) => {
      const rev = row.revenues;
      const dia = Math.min(rev?.due_day || 1, 28);
      const vencimento = new Date(rev?.year, row.month - 1, dia);
      return {
        cliente: rev?.clients?.name ?? 'Receita avulsa',
        valor: Number(row.amount || 0),
        status: row.status,
        vencimento: vencimento.toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
    )
    .slice(0, 6);

  const meta = metaRes.data;

  return {
    mrr: Number(mrrRes.data?.mrr ?? 0),
    clientesAtivos: clientesRes.count ?? 0,
    tarefasAtrasadas: tarefasRes.count ?? 0,
    pipeline: { quantidade: pipelineRows.length, valorEstimado },
    metas: meta
      ? {
          mrrMeta: Number(meta.mrr_goal || 0),
          clientesMeta: Number(meta.clients_goal || 0),
          receitaMeta: Number(meta.revenue_goal || 0),
          receitaRealizada: Number((receitaMesRes.data as any)?.total ?? 0),
        }
      : null,
    vencimentos,
    atividades: ((atividadeRes.data ?? []) as any[]).map((a) => ({
      id: a.id,
      actorEmail: a.actor_email,
      action: a.action,
      table: a.table_name,
      createdAt: a.created_at,
    })),
  };
}
