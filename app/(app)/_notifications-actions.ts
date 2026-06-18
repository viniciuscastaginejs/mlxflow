'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/role';

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const me = await getCurrentUser();

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', me.id);

  revalidatePath('/', 'layout');
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const me = await getCurrentUser();

  await supabase.from('notifications').update({ read: true }).eq('user_id', me.id).eq('read', false);

  revalidatePath('/', 'layout');
}
