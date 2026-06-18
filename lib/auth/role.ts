import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type Role = 'admin' | 'socio' | 'colaborador' | 'visualizador';

export type CurrentUser = {
  id: string;
  role: Role;
  fullName: string | null;
  email: string | null;
};

// Busca o usuário logado + papel (profiles.role).
// cache() do React deduplica isso por request: mesmo chamado em vários
// componentes (layout, page, server actions), só roda uma vez.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
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
    email: user.email ?? null,
  };
});

export const canManageClients = (role: Role) =>
  role === 'admin' || role === 'socio';

export const canSeeFinanceiro = (role: Role) => role !== 'colaborador';

export const isReadOnly = (role: Role) => role === 'visualizador';

export const canManageFinanceiro = (role: Role) => role === 'admin' || role === 'socio';

export const canManageUsers = (role: Role) => role === 'admin';

export const canSeeAuditoria = (role: Role) => role === 'admin' || role === 'socio';
