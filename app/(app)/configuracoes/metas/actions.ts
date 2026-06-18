'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canManageFinanceiro } from '@/lib/auth/role';

export async function saveMonthlyGoal(formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageFinanceiro(me.role)) {
    redirect('/configuracoes/metas?error=' + encodeURIComponent('Sem permissão.'));
  }

  const year = Number(formData.get('year') ?? 0);
  const month = Number(formData.get('month') ?? 0);
  const mrrGoal = Number(formData.get('mrr_goal') ?? 0);
  const clientsGoal = Number(formData.get('clients_goal') ?? 0);
  const revenueGoal = Number(formData.get('revenue_goal') ?? 0);

  const { data: existing } = await supabase
    .from('monthly_goals')
    .select('id')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  const payload = { year, month, mrr_goal: mrrGoal, clients_goal: clientsGoal, revenue_goal: revenueGoal };

  const { error } = existing
    ? await supabase.from('monthly_goals').update(payload).eq('id', existing.id)
    : await supabase.from('monthly_goals').insert(payload);

  if (error) {
    redirect(
      `/configuracoes/metas?ano=${year}&mes=${month}&error=` + encodeURIComponent(`Erro ao salvar: ${error.message}`)
    );
  }

  revalidatePath('/configuracoes/metas');
  revalidatePath('/dashboard');
  redirect(`/configuracoes/metas?ano=${year}&mes=${month}&success=` + encodeURIComponent('Meta salva.'));
}
