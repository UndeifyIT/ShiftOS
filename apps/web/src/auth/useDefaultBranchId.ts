import { useRpcQuery } from '../lib/useRpc.js';
import type { Branch } from '../types/domain.js';
import { useSession } from './SessionProvider.js';

/**
 * The one branch this caller works in, or null when there isn't a single one.
 *
 * - A branch-scoped caller with exactly one branch gets that branch
 *   (branchAccess.singleBranchId, computed server-side in
 *   packages/api/src/operations/context.ts).
 * - An org-wide caller (the Manager) gets their home branch: the
 *   organization's oldest active branch. Per the design handoff the Manager
 *   runs one branch ("Branch · Main Branch", "Branch overview") and never
 *   sees or switches between other branches, so every page that asks this
 *   hook hides its branch picker and works in that branch alone.
 * - Anyone else (no branch, or several branch grants) gets null, and the
 *   pages that support it show their picker.
 *
 * Returns null while an org-wide caller's branch list is still loading.
 * Not a substitute for permission/branch-access checks — those stay on the server.
 */
export function useDefaultBranchId(): string | null {
  const { myContext, hasPermission } = useSession();
  const access = myContext?.branchAccess;
  const single = access?.singleBranchId ?? null;
  const isOrgWide = access?.isOrgWide ?? false;
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, {
    enabled: isOrgWide && !single && hasPermission('branches.read')
  });

  if (single) return single;
  if (!isOrgWide) return null;
  const home = (branches ?? [])
    .filter((branch) => branch.is_active && !branch.deleted_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  return home?.id ?? (access?.branchIds.length === 1 ? access.branchIds[0] : null);
}
