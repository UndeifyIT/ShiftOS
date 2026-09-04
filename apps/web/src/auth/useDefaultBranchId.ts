import { useSession } from './SessionProvider.js';

/**
 * The single branch this caller is scoped to, or null when they're org-wide
 * (they see every branch, so there is no "the" branch) or have zero/several
 * accessible branches. Mirrors branchAccess.singleBranchId
 * (packages/api/src/operations/context.ts), computed once server-side so
 * every consumer agrees on what "single-branch" means instead of each page
 * re-deriving it from branchAccess.branchIds itself (see
 * docs/superpowers/specs/2026-09-03-onboarding-ux-audit-design.md §2 Phase 10).
 *
 * Intended for pages that want to silently default to (and, where
 * appropriate, hide the picker for) the one branch a user can act in —
 * not a substitute for permission/branch-access checks, which still belong
 * to the server.
 *
 * NOT the same semantics as TasksPage.tsx's `requireBranchPicker` (currently
 * `(branches ?? []).length !== 1`): that reacts to the caller's raw total
 * branch count with no org-wide distinction, so an org-wide Owner whose org
 * has exactly one branch gets `requireBranchPicker = false` there (picker
 * hidden) while the same Owner gets `singleBranchId === null` here (picker
 * shown), because org-wide callers always resolve to `null` regardless of
 * branch count. Do not treat the two as interchangeable, and do not migrate
 * `TasksPage.tsx`/`AttendancePage.tsx` onto this hook assuming they already
 * agree — that requires a product decision about which single-branch
 * definition is correct for those two pages.
 */
export function useDefaultBranchId(): string | null {
  const { myContext } = useSession();
  return myContext?.branchAccess.singleBranchId ?? null;
}
