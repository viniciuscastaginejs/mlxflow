'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getCurrentUser, canManageUsers, type Role } from '@/lib/auth/role';

export async function inviteTeamMember(formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageUsers(me.role)) {
    redirect('/configuracoes/usuarios?error=' + encodeURIComponent('Sem permissão.'));
  }

  const email = String(formData.get('email') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const role = String(formData.get('role') ?? 'visualizador') as Role;

  if (!email) {
    redirect('/configuracoes/usuarios?error=' + encodeURIComponent('Email é obrigatório.'));
  }

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });

  if (error || !data?.user) {
    redirect('/configuracoes/usuarios?error=' + encodeURIComponent(`Erro ao convidar: ${error?.message ?? 'desconhecido'}`));
  }

  await service
    .from('profiles')
    .update({ full_name: fullName || null, role })
    .eq('id', data.user.id);

  revalidatePath('/configuracoes/usuarios');
  redirect('/configuracoes/usuarios?success=' + encodeURIComponent('Convite enviado.'));
}

export async function updateUserRole(userId: string, role: Role, _formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageUsers(me.role)) {
    redirect('/configuracoes/usuarios?error=' + encodeURIComponent('Sem permissão.'));
  }

  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) {
    redirect('/configuracoes/usuarios?error=' + encodeURIComponent(`Erro ao salvar papel: ${error.message}`));
  }

  revalidatePath('/configuracoes/usuarios');
  redirect('/configuracoes/usuarios?success=' + encodeURIComponent('Papel atualizado.'));
}

export async function toggleUserActive(userId: string, nextActive: boolean, _formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageUsers(me.role)) {
    redirect('/configuracoes/usuarios?error=' + encodeURIComponent('Sem permissão.'));
  }
  if (userId === me.id) {
    redirect('/configuracoes/usuarios?error=' + encodeURIComponent('Você não pode desativar sua própria conta.'));
  }

  const { error } = await supabase.from('profiles').update({ active: nextActive }).eq('id', userId);
  if (error) {
    redirect('/configuracoes/usuarios?error=' + encodeURIComponent(`Erro ao atualizar: ${error.message}`));
  }

  revalidatePath('/configuracoes/usuarios');
  redirect(
    '/configuracoes/usuarios?success=' + encodeURIComponent(nextActive ? 'Usuário ativado.' : 'Usuário desativado.')
  );
}
