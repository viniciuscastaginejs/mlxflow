import type { SupabaseClient } from '@supabase/supabase-js';
import { canSeeFinanceiro, type Role } from '@/lib/auth/role';

const DIAS_VENCIMENTO = 5;
const DIAS_SEM_FOLLOWUP = 5;

type NovaNotificacao = {
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  related_table: string;
  related_id: string;
  read: false;
};

function diasAtras(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function diasNaFrente(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Roda a cada carregamento autenticado: detecta condições e cria notificações
// novas (uma única vez por item, via dedup em related_id+type).
export async function generateNotifications(
  supabase: SupabaseClient,
  userId: string,
  role: Role
): Promise<void> {
  const candidatos: NovaNotificacao[] = [];
  const hoje = new Date().toISOString().slice(0, 10);

  // 1) Pagamento vencendo/atrasado — só pra quem vê financeiro
  if (canSeeFinanceiro(role)) {
    const ano = new Date().getFullYear();
    const { data: revenues } = await supabase
      .from('revenues')
      .select('id, due_day, client_id, clients(name)')
      .eq('year', ano);

    const revenueIds = (revenues ?? []).map((r: any) => r.id);
    if (revenueIds.length > 0) {
      const { data: installments } = await supabase
        .from('revenue_installments')
        .select('id, revenue_id, month, status')
        .in('revenue_id', revenueIds)
        .in('status', ['pendente', 'atrasado']);

      const revenueById = (revenues ?? []).reduce((acc: Record<string, any>, r: any) => {
        acc[r.id] = r;
        return acc;
      }, {});

      for (const inst of installments ?? []) {
        const rev = revenueById[(inst as any).revenue_id];
        if (!rev) continue;
        const dia = Math.min(rev.due_day || 1, 28);
        const vencimento = new Date(ano, (inst as any).month - 1, dia).toISOString().slice(0, 10);
        const atrasado = (inst as any).status === 'atrasado';
        const vencendoEmBreve = vencimento >= hoje && vencimento <= diasNaFrente(DIAS_VENCIMENTO);

        if (atrasado || vencendoEmBreve) {
          const nomeCliente = rev.clients?.name ?? 'Receita avulsa';
          candidatos.push({
            user_id: userId,
            type: 'pagamento_vencendo',
            title: atrasado ? `Pagamento atrasado: ${nomeCliente}` : `Pagamento vence em breve: ${nomeCliente}`,
            body: `Parcela de ${vencimento.split('-').reverse().join('/')}.`,
            related_table: 'revenue_installments',
            related_id: (inst as any).id,
            read: false,
          });
        }
      }
    }
  }

  // 2) Tarefa atrasada — assignee = usuário atual
  const { data: tarefas } = await supabase
    .from('tasks')
    .select('id, title, due_date, status')
    .eq('assignee_id', userId)
    .lt('due_date', hoje)
    .neq('status', 'concluido');

  for (const t of tarefas ?? []) {
    candidatos.push({
      user_id: userId,
      type: 'tarefa_atrasada',
      title: `Tarefa atrasada: ${(t as any).title}`,
      body: `Prazo era ${String((t as any).due_date).split('-').reverse().join('/')}.`,
      related_table: 'tasks',
      related_id: (t as any).id,
      read: false,
    });
  }

  // 3) Post pendente de aprovação — cliente cujo responsável é o usuário atual
  const { data: posts } = await supabase
    .from('editorial_posts')
    .select('id, caption, scheduled_date, client_id, clients(name, responsible_id)')
    .eq('status', 'aprovacao_pendente');

  for (const p of posts ?? []) {
    const cliente = (p as any).clients;
    if (cliente?.responsible_id !== userId) continue;
    candidatos.push({
      user_id: userId,
      type: 'post_pendente',
      title: `Post pendente de aprovação: ${cliente.name}`,
      body: (p as any).caption ?? null,
      related_table: 'editorial_posts',
      related_id: (p as any).id,
      read: false,
    });
  }

  // 4) Lead sem follow-up — responsável = usuário atual
  const { data: deals } = await supabase
    .from('pipeline_deals')
    .select('id, company_name, responsible_id, stage, created_at')
    .eq('responsible_id', userId)
    .not('stage', 'in', '(fechado,perdido)');

  const dealIds = (deals ?? []).map((d: any) => d.id);
  let lastFollowupByDeal: Record<string, string> = {};
  if (dealIds.length > 0) {
    const { data: followups } = await supabase
      .from('pipeline_followups')
      .select('deal_id, created_at')
      .in('deal_id', dealIds)
      .order('created_at', { ascending: false });
    for (const f of followups ?? []) {
      const id = (f as any).deal_id;
      if (!lastFollowupByDeal[id]) lastFollowupByDeal[id] = (f as any).created_at;
    }
  }

  const limite = diasAtras(DIAS_SEM_FOLLOWUP);
  for (const d of deals ?? []) {
    const ultimo = lastFollowupByDeal[(d as any).id] ?? (d as any).created_at;
    if (ultimo.slice(0, 10) <= limite) {
      candidatos.push({
        user_id: userId,
        type: 'lead_sem_followup',
        title: `Sem follow-up há ${DIAS_SEM_FOLLOWUP}+ dias: ${(d as any).company_name}`,
        body: null,
        related_table: 'pipeline_deals',
        related_id: (d as any).id,
        read: false,
      });
    }
  }

  if (candidatos.length === 0) return;

  // Dedup: nunca recriar notificação pro mesmo item (independente de já ter sido lida).
  const { data: existentes } = await supabase
    .from('notifications')
    .select('type, related_id')
    .eq('user_id', userId);

  const vistos = new Set((existentes ?? []).map((e: any) => `${e.type}:${e.related_id}`));
  const novas = candidatos.filter((c) => !vistos.has(`${c.type}:${c.related_id}`));

  if (novas.length > 0) {
    await supabase.from('notifications').insert(novas);
  }
}
