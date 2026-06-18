import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../login/actions';
import Nav from './_nav';
import Bell from './_bell';
import { generateNotifications } from '@/lib/notifications/generate';
import { getNotifications, getUnreadCount } from '@/lib/queries/notifications';
import type { Role } from '@/lib/auth/role';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single();

  const role = (profile?.role ?? 'visualizador') as Role;

  await generateNotifications(supabase, user!.id, role);
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(supabase, user!.id),
    getUnreadCount(supabase, user!.id),
  ]);

  const nome = profile?.full_name || user?.email || 'Usuário';
  const inicial = nome.trim().charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Image src="/logo-mark.png" alt="MLX" width={40} height={38} className="brand-mark-img" priority />
          <div className="brand-name">
            MLX <span>Flow</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Bell notifications={notifications} unreadCount={unreadCount} />
          </div>
        </div>

        <Nav role={role} />

        <div className="sidebar-foot">
          <div className="who">
            <div className="who-avatar">{inicial}</div>
            <div>
              <div className="who-name">{nome}</div>
              <div className="who-role">{profile?.role ?? ''}</div>
            </div>
          </div>
          <form action={logout}>
            <button className="logout-btn" type="submit">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
