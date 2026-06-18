'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canManageFinanceiro } from '@/lib/auth/role';
import type { ExpenseCategory, InstallmentStatus, PartnerType, RevenueType } from '@/lib/queries/financeiro';

type ActionResult = { ok: true } | { ok: false; error: string };

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

export async function createRevenue(
  year: number,
  input: { clientId: string | null; description: string | null; type: RevenueType; month: number | null }
): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (!canManageFinanceiro(me.role)) return { ok: false, error: 'Sem permissão.' };
  if (!input.clientId && !input.description?.trim()) {
    return { ok: false, error: 'Escolha um cliente ou descreva a receita avulsa.' };
  }
  if (input.type === 'servico_unico' && !input.month) {
    return { ok: false, error: 'Escolha o mês da receita única.' };
  }

  const { data: revenue, error } = await supabase
    .from('revenues')
    .insert({
      client_id: input.clientId || null,
      description: input.description?.trim() || null,
      type: input.type,
      year,
    })
    .select('id')
    .single();

  if (error || !revenue) return { ok: false, error: `Erro ao criar receita: ${error?.message ?? 'desconhecido'}` };

  // Receita "única": só cria a parcela do mês escolhido — os demais meses ficam
  // sem linha (mostrados como "—" na grade), sem precisar de coluna nova no banco.
  const meses = input.type === 'servico_unico' ? [input.month!] : MESES;
  const { data: installments, error: instError } = await supabase
    .from('revenue_installments')
    .insert(meses.map((month) => ({ revenue_id: revenue.id, month, amount: 0, status: 'pendente' })))
    .select('id');

  if (instError || !installments || installments.length !== meses.length) {
    await supabase.from('revenues').delete().eq('id', revenue.id);
    return {
      ok: false,
      error: `Erro ao criar as parcelas da receita: ${instError?.message ?? 'permissão negada'}`,
    };
  }

  revalidatePath('/financeiro');
  return { ok: true, id: revenue.id };
}

export async function createExpense(
  year: number,
  input: { description: string; category: ExpenseCategory }
): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (!canManageFinanceiro(me.role)) return { ok: false, error: 'Sem permissão.' };
  if (!input.description.trim()) return { ok: false, error: 'Descrição é obrigatória.' };

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({ description: input.description.trim(), category: input.category, year })
    .select('id')
    .single();

  if (error || !expense) return { ok: false, error: `Erro ao criar despesa: ${error?.message ?? 'desconhecido'}` };

  const { data: installments, error: instError } = await supabase
    .from('expense_installments')
    .insert(MESES.map((month) => ({ expense_id: expense.id, month, amount: 0 })))
    .select('id');

  if (instError || !installments || installments.length !== 12) {
    await supabase.from('expenses').delete().eq('id', expense.id);
    return {
      ok: false,
      error: `Erro ao criar as parcelas da despesa: ${instError?.message ?? 'permissão negada'}`,
    };
  }

  revalidatePath('/financeiro');
  return { ok: true, id: expense.id };
}

export async function createPartnerPayment(
  year: number,
  input: { partnerName: string; type: PartnerType; quantity: number }
): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (!canManageFinanceiro(me.role)) return { ok: false, error: 'Sem permissão.' };
  if (!input.partnerName.trim()) return { ok: false, error: 'Nome é obrigatório.' };

  const { data: partner, error } = await supabase
    .from('partner_payments')
    .insert({
      partner_name: input.partnerName.trim(),
      type: input.type,
      quantity: input.quantity,
      year,
    })
    .select('id')
    .single();

  if (error || !partner) return { ok: false, error: `Erro ao criar parceiro: ${error?.message ?? 'desconhecido'}` };

  const { data: installments, error: instError } = await supabase
    .from('partner_payment_installments')
    .insert(MESES.map((month) => ({ partner_payment_id: partner.id, month, amount: 0 })))
    .select('id');

  if (instError || !installments || installments.length !== 12) {
    await supabase.from('partner_payments').delete().eq('id', partner.id);
    return {
      ok: false,
      error: `Erro ao criar as parcelas do parceiro: ${instError?.message ?? 'permissão negada'}`,
    };
  }

  revalidatePath('/financeiro');
  return { ok: true, id: partner.id };
}

export async function updateRevenueInstallment(
  installmentId: string,
  amount: number,
  status: InstallmentStatus
): Promise<ActionResult> {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (!canManageFinanceiro(me.role)) return { ok: false, error: 'Sem permissão.' };

  const { data, error } = await supabase
    .from('revenue_installments')
    .update({
      amount,
      status,
      paid_at: status === 'pago' ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', installmentId)
    .select('id');

  if (error) return { ok: false, error: `Erro ao salvar: ${error.message}` };
  if (!data || data.length === 0) return { ok: false, error: 'Nada foi salvo (parcela não encontrada ou sem permissão).' };

  revalidatePath('/financeiro');
  return { ok: true };
}

export async function updateExpenseInstallment(
  installmentId: string,
  amount: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (!canManageFinanceiro(me.role)) return { ok: false, error: 'Sem permissão.' };

  const { data, error } = await supabase
    .from('expense_installments')
    .update({ amount })
    .eq('id', installmentId)
    .select('id');

  if (error) return { ok: false, error: `Erro ao salvar: ${error.message}` };
  if (!data || data.length === 0) return { ok: false, error: 'Nada foi salvo (parcela não encontrada ou sem permissão).' };

  revalidatePath('/financeiro');
  return { ok: true };
}

export async function updatePartnerInstallment(
  installmentId: string,
  amount: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (!canManageFinanceiro(me.role)) return { ok: false, error: 'Sem permissão.' };

  const { data, error } = await supabase
    .from('partner_payment_installments')
    .update({ amount })
    .eq('id', installmentId)
    .select('id');

  if (error) return { ok: false, error: `Erro ao salvar: ${error.message}` };
  if (!data || data.length === 0) return { ok: false, error: 'Nada foi salvo (parcela não encontrada ou sem permissão).' };

  revalidatePath('/financeiro');
  return { ok: true };
}
