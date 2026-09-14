import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoMark from '../../assets/logo-mark.png';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Branch } from '../../types/domain.js';
import { OverviewHeader } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';

interface ComingSoonLink {
  label: string;
  to: string;
}

interface PageCopy {
  title: string;
  subtitle: (names: { branch: string; organization: string }) => string;
  body: string;
  links: ComingSoonLink[];
}

/** Titles and subtitles from the handoff's PAGES["Manager/…"]; the links reach the parts of these pages that already exist elsewhere. */
export const COMING_SOON_PAGES = {
  supervisors: {
    title: 'Supervisors',
    subtitle: ({ branch }) => `Supervisors and invitations · ${branch}`,
    body: 'The supervisors directory is being set up. Until then, invite supervisors and manage everyone’s role from these pages.',
    links: [
      { label: 'Invite a supervisor', to: '/invitations' },
      { label: 'Members & roles', to: '/members' }
    ]
  },
  admins: {
    title: 'Admins',
    subtitle: () => 'Organization-wide access',
    body: 'The admins directory is being set up. Until then, invite admins and manage roles from these pages.',
    links: [
      { label: 'Invite an admin', to: '/invitations' },
      { label: 'Members & roles', to: '/members' }
    ]
  },
  recentActivity: {
    title: 'Recent Activity',
    subtitle: () => 'All real-time activities and updates from today’s shift',
    body: 'The full activity feed is being set up. The overview shows the latest activity, and Attendance has every clock-in.',
    links: [
      { label: 'Back to overview', to: '/' },
      { label: 'Open attendance', to: '/attendance' }
    ]
  },
  reports: {
    title: 'Reports',
    subtitle: ({ branch }) => `${branch} · last 30 days`,
    body: 'Reports are being set up. Attendance already shows hours and clock-ins week by week.',
    links: [{ label: 'Open attendance', to: '/attendance' }]
  },
  settings: {
    title: 'Settings',
    subtitle: ({ branch, organization }) => `${organization} · ${branch}`,
    body: 'The settings page is being set up. Your profile, organization details and account security are here for now.',
    links: [
      { label: 'Profile', to: '/profile' },
      { label: 'Organization', to: '/organization' },
      { label: 'Security', to: '/security' }
    ]
  }
} satisfies Record<string, PageCopy>;

/**
 * A handoff Manager page that hasn't been built yet: the page's own header
 * and the handoff's empty-state card saying it's being set up, with links
 * to whatever already covers it.
 */
export default function ComingSoonPage({ page }: { page: keyof typeof COMING_SOON_PAGES }): React.ReactElement {
  const navigate = useNavigate();
  const now = useNow();
  const { activeOrganization, hasPermission } = useSession();
  const branchId = useDefaultBranchId();
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const copy: PageCopy = COMING_SOON_PAGES[page];
  const names = {
    branch: (branches ?? []).find((b) => b.id === branchId)?.name ?? 'Your branch',
    organization: activeOrganization?.name ?? 'Your organization'
  };

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title={copy.title} subtitle={copy.subtitle(names)} now={now} />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">
        <div className="flex flex-col items-center rounded-[20px] border border-solid border-[#EBE7E3] bg-white px-8 py-[52px] text-center">
          <div className="flex size-16 items-center justify-center rounded-[20px] bg-[#FDF0E9]">
            <img src={logoMark} alt="" className="block h-[35px] w-auto" />
          </div>
          <h2 className="mb-0 mt-5 text-[21px] font-extrabold tracking-[-0.02em]">{copy.title} is coming soon</h2>
          <p className="mb-0 mt-2 max-w-[420px] text-[13.5px] leading-[1.55] text-[#857A72]">{copy.body}</p>
          <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
            {copy.links.map((link, index) => (
              <button
                key={link.to + link.label}
                type="button"
                onClick={() => navigate(link.to)}
                className={
                  index === 0
                    ? 'h-[42px] cursor-pointer rounded-[12px] border-0 bg-[#F04E17] px-5 text-[13.5px] font-bold text-white shadow-[0_10px_22px_-12px_rgba(240,78,23,.7)] hover:bg-[#DC4611]'
                    : 'h-[42px] cursor-pointer rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[18px] text-[13.5px] font-bold text-[#38312B] hover:border-[#DDD6D0]'
                }
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
