import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../auth/SessionProvider.js';
import { ManagerOverviewBody, OverviewEmpty, OverviewHeader, OverviewLoading } from './manager/ManagerOverview.js';
import { longDay } from './manager/overviewModel.js';
import { useManagerOverview } from './manager/useManagerOverview.js';

/**
 * WEB-017 — the Manager's "Branch overview", rebuilt to the design handoff
 * (`ShiftOS Dashboards.dc.html`, Manager / Overview): Shifty nudge, Ask
 * ShiftOS, four stats, department coverage today, needs your attention,
 * quick actions, announcements and recent activity — every number from the
 * live data of the Manager's own branch (they never see or switch to others).
 */
export default function ManagerDashboardPage(): React.ReactElement {
  const navigate = useNavigate();
  const { hasPermission, activeOrganization } = useSession();
  const { status, now, branch, overview } = useManagerOverview();
  const canCreateEmployees = hasPermission('employees.create');

  const subtitle = overview?.subtitle ?? `${branch?.name ?? activeOrganization?.name ?? 'Your branch'} · ${longDay(now)}`;

  return (
    // 13px base and the browser's default line height are what the handoff renders with (it has no CSS reset).
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader subtitle={subtitle} now={now} />

      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">
        {status === 'loading' ? (
          <OverviewLoading />
        ) : status === 'no-branch' ? (
          <OverviewEmpty
            title="Set up your first branch"
            body="Branches are the foundation for staffing and scheduling — open one to get started."
            cta={hasPermission('branches.create') ? { label: 'Open a branch', onClick: () => navigate('/branches/new') } : null}
            secondary={null}
          />
        ) : status === 'empty' || !overview ? (
          <OverviewEmpty
            title="Add your team to get started"
            body="ShiftOS organizes people, shifts and attendance by department. Add your team to start scheduling."
            cta={canCreateEmployees ? { label: 'Add employee', onClick: () => navigate('/employees/new') } : null}
            secondary={canCreateEmployees ? { label: 'Import employees', onClick: () => navigate('/employees/import') } : null}
          />
        ) : (
          <ManagerOverviewBody overview={overview} now={now} />
        )}
      </div>
    </div>
  );
}
