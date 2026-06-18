import type { SupabaseClient } from '@supabase/supabase-js';

export type RevenueType = 'recorrente' | 'servico_unico';
export type InstallmentStatus = 'pago' | 'pendente' | 'atrasado';
export type ExpenseCategory = 'ferramenta' | 'comunicacao' | 'trafego' | 'outros';
export type PartnerType = 'mlx_cash' | 'mlx_recorrencia';

export const REVENUE_TYPE_LABEL: Record<RevenueType, string> = {
  recorrente: 'Recorrente',
  servico_unico: 'Único',
};

export const STATUS_LABEL: Record<InstallmentStatus, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
};

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  ferramenta: 'Ferramenta',
  comunicacao: 'Comunicação',
  trafego: 'Tráfego',
  outros: 'Outros',
};

export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  mlx_cash: 'MLX Cash',
  mlx_recorrencia: 'MLX Recorrência',
};

export type RevenueInstallment = {
  id: string;
  month: number;
  amount: number;
  status: InstallmentStatus;
};

export type RevenueRow = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  description: string | null;
  type: RevenueType;
  installments: RevenueInstallment[];
};

export type SimpleInstallment = {
  id: string;
  month: number;
  amount: number;
};

export type ExpenseRow = {
  id: string;
  description: string;
  category: ExpenseCategory;
  installments: SimpleInstallment[];
};

export type PartnerRow = {
  id: string;
  partnerName: string;
  type: PartnerType;
  quantity: number;
  installments: SimpleInstallment[];
};

export type MonthlyTotal = {
  month: number;
  receita: number;
  despesa: number;
  parceiros: number;
  lucroLiquido: number;
};

export type FinanceiroAno = {
  revenues: RevenueRow[];
  expenses: ExpenseRow[];
  partners: PartnerRow[];
  monthlyTotals: MonthlyTotal[];
  mrr: number;
};

function blankMonthlyTotals(): MonthlyTotal[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    receita: 0,
    despesa: 0,
    parceiros: 0,
    lucroLiquido: 0,
  }));
}

export async function getFinanceiroAno(
  supabase: SupabaseClient,
  year: number
): Promise<FinanceiroAno> {
  const [revenuesRes, expensesRes, partnersRes, mrrRes] = await Promise.all([
    supabase
      .from('revenues')
      .select('id, client_id, description, type')
      .eq('year', year)
      .order('created_at', { ascending: true }),
    supabase
      .from('expenses')
      .select('id, description, category')
      .eq('year', year)
      .order('created_at', { ascending: true }),
    supabase
      .from('partner_payments')
      .select('id, partner_name, type, quantity')
      .eq('year', year)
      .order('created_at', { ascending: true }),
    supabase.from('v_mrr').select('mrr').single(),
  ]);

  if (revenuesRes.error) throw revenuesRes.error;
  if (expensesRes.error) throw expensesRes.error;
  if (partnersRes.error) throw partnersRes.error;

  const revenuesData = revenuesRes.data ?? [];
  const expensesData = expensesRes.data ?? [];
  const partnersData = partnersRes.data ?? [];

  const revenueIds = revenuesData.map((r: any) => r.id);
  const expenseIds = expensesData.map((e: any) => e.id);
  const partnerIds = partnersData.map((p: any) => p.id);

  const [revInstRes, expInstRes, partInstRes] = await Promise.all([
    revenueIds.length > 0
      ? supabase
          .from('revenue_installments')
          .select('id, revenue_id, month, amount, status')
          .in('revenue_id', revenueIds)
      : Promise.resolve({ data: [], error: null }),
    expenseIds.length > 0
      ? supabase
          .from('expense_installments')
          .select('id, expense_id, month, amount')
          .in('expense_id', expenseIds)
      : Promise.resolve({ data: [], error: null }),
    partnerIds.length > 0
      ? supabase
          .from('partner_payment_installments')
          .select('id, partner_payment_id, month, amount')
          .in('partner_payment_id', partnerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (revInstRes.error) throw revInstRes.error;
  if (expInstRes.error) throw expInstRes.error;
  if (partInstRes.error) throw partInstRes.error;

  const clientIds = [...new Set(revenuesData.map((r: any) => r.client_id).filter(Boolean))];
  let nameByClientId: Record<string, string> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase.from('clients').select('id, name').in('id', clientIds);
    nameByClientId = (clients ?? []).reduce((acc: Record<string, string>, c: any) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
  }

  const revInstByRevenue = (revInstRes.data ?? []).reduce(
    (acc: Record<string, RevenueInstallment[]>, i: any) => {
      (acc[i.revenue_id] ??= []).push({ id: i.id, month: i.month, amount: Number(i.amount || 0), status: i.status });
      return acc;
    },
    {}
  );

  const expInstByExpense = (expInstRes.data ?? []).reduce(
    (acc: Record<string, SimpleInstallment[]>, i: any) => {
      (acc[i.expense_id] ??= []).push({ id: i.id, month: i.month, amount: Number(i.amount || 0) });
      return acc;
    },
    {}
  );

  const partInstByPartner = (partInstRes.data ?? []).reduce(
    (acc: Record<string, SimpleInstallment[]>, i: any) => {
      (acc[i.partner_payment_id] ??= []).push({ id: i.id, month: i.month, amount: Number(i.amount || 0) });
      return acc;
    },
    {}
  );

  const revenues: RevenueRow[] = revenuesData.map((r: any) => ({
    id: r.id,
    clientId: r.client_id ?? null,
    clientName: r.client_id ? nameByClientId[r.client_id] ?? null : null,
    description: r.description ?? null,
    type: r.type,
    installments: (revInstByRevenue[r.id] ?? []).sort((a, b) => a.month - b.month),
  }));

  const expenses: ExpenseRow[] = expensesData.map((e: any) => ({
    id: e.id,
    description: e.description,
    category: e.category,
    installments: (expInstByExpense[e.id] ?? []).sort((a, b) => a.month - b.month),
  }));

  const partners: PartnerRow[] = partnersData.map((p: any) => ({
    id: p.id,
    partnerName: p.partner_name,
    type: p.type,
    quantity: p.quantity ?? 0,
    installments: (partInstByPartner[p.id] ?? []).sort((a, b) => a.month - b.month),
  }));

  // Totais calculados a partir das próprias parcelas (mesmos dados da grade),
  // em vez da view v_monthly_profit — garante que o rodapé bate exatamente
  // com o que foi digitado nas células, sem depender de a view estar atualizada.
  const monthlyTotals = blankMonthlyTotals();
  for (const r of revenues) {
    for (const inst of r.installments) {
      monthlyTotals[inst.month - 1].receita += inst.amount;
    }
  }
  for (const e of expenses) {
    for (const inst of e.installments) {
      monthlyTotals[inst.month - 1].despesa += inst.amount;
    }
  }
  for (const p of partners) {
    for (const inst of p.installments) {
      monthlyTotals[inst.month - 1].parceiros += inst.amount;
    }
  }
  for (const m of monthlyTotals) {
    m.lucroLiquido = m.receita - m.despesa - m.parceiros;
  }

  return {
    revenues,
    expenses,
    partners,
    monthlyTotals,
    mrr: Number(mrrRes.data?.mrr ?? 0),
  };
}
