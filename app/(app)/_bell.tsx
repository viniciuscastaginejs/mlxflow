'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppNotification } from '@/lib/queries/notifications';
import { markNotificationRead, markAllNotificationsRead } from './_notifications-actions';
import { BellIcon } from './_icons';

export default function Bell({
  notifications,
  unreadCount,
}: {
  notifications: AppNotification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleClickNotification(id: string) {
    await markNotificationRead(id);
    router.refresh();
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    router.refresh();
  }

  return (
    <div className="bell-wrap" ref={ref}>
      <button className="bell-btn" onClick={() => setOpen((v) => !v)} aria-label="Notificações">
        <BellIcon />
        {unreadCount > 0 && <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-panel-head">
            <span>Notificações</span>
            {unreadCount > 0 && (
              <button className="bell-mark-all" onClick={handleMarkAll}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="empty" style={{ padding: '14px 16px' }}>
              Nenhuma notificação.
            </p>
          ) : (
            <div className="bell-list">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className={`bell-item${n.read ? '' : ' is-unread'}`}
                  onClick={() => handleClickNotification(n.id)}
                >
                  <div className="bell-item-title">{n.title}</div>
                  {n.body && <div className="bell-item-body">{n.body}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
