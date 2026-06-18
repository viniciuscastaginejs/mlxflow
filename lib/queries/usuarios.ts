import type { SupabaseClient } from '@supabase/supabase-js';
import type { Role } from '@/lib/auth/role';

export type Profile = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: Role;
  active: boolean;
  createdAt: string;
};

export async function getProfiles(supabase: SupabaseClient): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, active, created_at')
    .order('full_name', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    fullName: p.full_name ?? null,
    email: p.email ?? null,
    role: p.role,
    active: !!p.active,
    createdAt: p.created_at,
  }));
}
