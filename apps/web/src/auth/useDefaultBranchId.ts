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
 */
export function useDefaultBranchId(): string | null {
  const { myContext } = useSession();
  return myContext?.branchAccess.singleBranchId ?? null;
}
