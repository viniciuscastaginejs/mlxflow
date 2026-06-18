import type { SupabaseClient } from '@supabase/supabase-js';

export type Role = 'admin' | 'socio' | 'colaborador' | 'visualizador';

export type CurrentUser = {
  id: string;
  role: Role;
  fullName: string | null;
};

// Busca o usuário logado + papel (profiles.role). Chamado uma vez por página.
export async function getCurrentUser(
  supabase: SupabaseClient
): Promise<CurrentUser> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // o middleware já garante sessão em rotas protegidas
    throw new Error('not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    role: (profile?.role ?? 'visualizador') as Role,
    fullName: profile?.full_name ?? null,
  };
}

export const canManageClients = (role: Role) =>
  role === 'admin' || role === 'socio';

export const canSeeFinanceiro = (role: Role) => role !== 'colaborador';

export const isReadOnly = (role: Role) => role === 'visualizador';

export const canManageFinanceiro = (role: Role) => role === 'admin' || role === 'socio';

export const canManageUsers = (role: Role) => role === 'admin';

export const canSeeAuditoria = (role: Role) => role === 'admin' || role === 'socio';
