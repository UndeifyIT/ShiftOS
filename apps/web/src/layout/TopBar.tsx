import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, IconButton } from '@shiftos/ui';
import { useSession } from '../auth/SessionProvider.js';
import { useSignedAvatarUrl } from '../lib/avatars.js';

/**
 * Houses the two low-frequency identity affordances the frontend foundation
 * doc calls for as compact, non-persistent controls rather than always-on
 * chrome (§E): the organization switcher (SHARED-006, only rendered when the
 * identity actually belongs to more than one organization) and the account
 * menu (profile / security / sign out).
 */
export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }): React.ReactElement {
  const { profile, organizations, myContext, switchOrganization, signOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const navigate = useNavigate();

  const activeOrg = organizations.find((org) => org.id === myContext?.organizationId);
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : '';
  const avatarUrl = useSignedAvatarUrl(profile?.avatar_url);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <IconButton aria-label="Open navigation" variant="ghost" className="md:hidden" onClick={onOpenMobileNav}>
          <span aria-hidden="true">☰</span>
        </IconButton>
        {organizations.length > 1 ? (
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={orgMenuOpen}
              onClick={() => setOrgMenuOpen((open) => !open)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
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
    </header>
  );
}
