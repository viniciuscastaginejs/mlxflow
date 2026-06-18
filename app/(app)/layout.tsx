import { Suspense } from 'react';
import Image from 'next/image';
import { logout } from '../login/actions';
import Nav from './_nav';
import Bell from './_bell';
import NotificationsPanel from './_notifications-panel';
import { getCurrentUser } from '@/lib/auth/role';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();

  const nome = me.fullName || me.email || 'Usuário';
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
            <Suspense fallback={<Bell notifications={[]} unreadCount={0} />}>
              <NotificationsPanel userId={me.id} role={me.role} />
            </Suspense>
          </div>
        </div>

        <Nav role={me.role} />

        <div className="sidebar-foot">
          <div className="who">
            <div className="who-avatar">{inicial}</div>
            <div>
              <div className="who-name">{nome}</div>
              <div className="who-role">{me.role}</div>
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
