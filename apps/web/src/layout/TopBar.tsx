import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Sparkles } from 'lucide-react';
import { Avatar, IconButton } from '@shiftos/ui';
import { useSession } from '../auth/SessionProvider.js';
import { AssistantPanel } from '../components/assistant/AssistantPanel.js';
import { useSignedAvatarUrl } from '../lib/avatars.js';
import { useRpcMutation, useRpcQuery } from '../lib/useRpc.js';
import type { Notification } from '../types/domain.js';

/** Short, non-relative date for a notification row — e.g. "Aug 24, 3:10 PM". */
function formatNotificationDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Houses the two low-frequency identity affordances the frontend foundation
 * doc calls for as compact, non-persistent controls rather than always-on
 * chrome (§E): the organization switcher (SHARED-006, only rendered when the
 * identity actually belongs to more than one organization) and the account
 * menu (profile / security / sign out). Also houses the minimal notifications
 * bell + dropdown (spec decision 4 — list/mark-read only, no preferences UI).
 */
export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }): React.ReactElement {
  const { profile, organizations, myContext, switchOrganization, signOut, hasPermission } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const navigate = useNavigate();

  const activeOrg = organizations.find((org) => org.id === myContext?.organizationId);
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : '';
  const avatarUrl = useSignedAvatarUrl(profile?.avatar_url);

  const canReadNotifications = hasPermission('notifications.read');
  const { data: notifications } = useRpcQuery<Notification[]>(
    'list_my_notifications',
    { limit: 20 },
    { enabled: canReadNotifications }
  );
  const unreadCount = (notifications ?? []).filter((n) => n.read_at === null).length;

  const markRead = useRpcMutation<Notification, { notificationId: string }>('mark_notification_read', {
    invalidates: ['list_my_notifications']
  });
  const markAllRead = useRpcMutation<{ markedRead: number }, void>('mark_all_notifications_read', {
    invalidates: ['list_my_notifications']
  });

  return (
    <header className="pointer-events-auto flex h-14 items-center justify-between rounded-2xl border border-white/40 bg-white/20 px-3 shadow-[0_10px_36px_-16px_rgba(56,49,43,0.28)] backdrop-blur-md sm:px-4">
      <div className="flex items-center gap-3">
        <IconButton aria-label="Open navigation" variant="ghost" className="min-[860px]:hidden" onClick={onOpenMobileNav}>
          <span aria-hidden="true">☰</span>
        </IconButton>
        {organizations.length > 1 ? (
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={orgMenuOpen}
              onClick={() => setOrgMenuOpen((open) => !open)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-white/70"
            >
              {activeOrg?.name ?? 'Select organization'} <span aria-hidden="true">▾</span>
            </button>
            {orgMenuOpen ? (
              <div role="menu" className="absolute left-0 z-20 mt-1 w-56 rounded-lg border border-neutral-200 bg-white p-1 shadow-md">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    role="menuitem"
                    onClick={() => {
                      setOrgMenuOpen(false);
                      void switchOrganization(org.id);
                    }}
                    className={[
                      'w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100',
                      org.id === activeOrg?.id ? 'font-semibold text-brand-700' : 'text-neutral-700'
                    ].join(' ')}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <span className="text-sm font-medium text-neutral-700">{activeOrg?.name}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={assistantOpen}
            aria-label="Ask ShiftOS"
            onClick={() => setAssistantOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <Sparkles size={18} aria-hidden="true" />
          </button>
          {assistantOpen ? (
            <div className="absolute right-0 z-20 mt-1">
              <AssistantPanel onClose={() => setAssistantOpen(false)} />
            </div>
          ) : null}
        </div>

        {canReadNotifications ? (
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={notificationsOpen}
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <Bell size={18} aria-hidden="true" />
              {unreadCount > 0 ? (
                <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error-500" />
              ) : null}
            </button>
            {notificationsOpen ? (
              <div role="menu" className="absolute right-0 z-20 mt-1 w-80 rounded-lg border border-neutral-200 bg-white p-1 shadow-md">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-neutral-900">Notifications</span>
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        markAllRead.mutate();
                      }}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      Mark all read
                    </button>
                  ) : null}
                </div>
                {(notifications ?? []).length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-neutral-500">No notifications yet</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {(notifications ?? []).map((n) => {
                      const unread = n.read_at === null;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setNotificationsOpen(false);
                            if (unread) markRead.mutate({ notificationId: n.id });
                          }}
                          className={[
                            'flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100',
                            unread ? 'bg-brand-50' : ''
                          ].join(' ')}
                        >
                          <span
                            aria-hidden="true"
                            className={['mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', unread ? 'bg-brand-600' : 'bg-transparent'].join(' ')}
                          />
                          <span className="min-w-0 flex-1">
                            <span className={['block truncate', unread ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-700'].join(' ')}>
                              {n.title}
                            </span>
                            <span className="block truncate text-xs text-neutral-500">{n.content}</span>
                            <span className="block text-xs text-neutral-400">{formatNotificationDate(n.created_at)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Account menu for ${fullName}`}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <Avatar name={fullName || 'User'} src={avatarUrl} size={32} />
          </button>
          {menuOpen ? (
            <div role="menu" className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-neutral-200 bg-white p-1 shadow-md">
              <div className="px-3 py-2 text-sm font-medium text-neutral-900">{fullName}</div>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/profile');
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
              >
                My Profile
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/security');
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
              >
                Security & Sessions
              </button>
              <button
                role="menuitem"
                onClick={() => void signOut()}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50"
              >
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
