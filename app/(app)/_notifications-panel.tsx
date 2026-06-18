import { createClient } from '@/lib/supabase/server';
import { generateNotifications } from '@/lib/notifications/generate';
import { getNotifications, getUnreadCount } from '@/lib/queries/notifications';
import type { Role } from '@/lib/auth/role';
import Bell from './_bell';

// Server Component isolado e suspenso pelo layout: a geração/busca de
// notificações não bloqueia o render da página, só do sininho.
export default async function NotificationsPanel({
  userId,
  role,
}: {
  userId: string;
  role: Role;
}) {
  const supabase = await createClient();

  await generateNotifications(supabase, userId, role);
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(supabase, userId),
    getUnreadCount(supabase, userId),
  ]);

  return <Bell notifications={notifications} unreadCount={unreadCount} />;
}
