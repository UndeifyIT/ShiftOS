# Lovable Frontend Integration — Remaining Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the real, verified gaps between the Lovable-designed `shift-app-hero/` prototype and the production `apps/web` integration, without re-architecting or re-porting work that is already done correctly.

**Architecture:** `apps/web` (React 18 + Vite + react-router + `packages/ui` + `packages/api` RPC client) stays the single production frontend. `shift-app-hero/` remains a read-only visual reference — never imported from, never treated as a second app. Every new backend-touching feature goes through the existing `UI → RPC operation → Service → Repository → Database` path (`packages/api/src/operations/*.ts` → `packages/services` → `packages/repositories` → Supabase), matching the pattern already used by `EmployeeService`/`MembershipService`.

**Tech Stack:** TypeScript, React 18, Vite, react-router-dom, `@shiftos/ui`, `@shiftos/services`/`@shiftos/api`/`@shiftos/repositories`, Supabase (Postgres + Storage + Auth), Tailwind (existing `brand-*`/`success-*`/`neutral-*` token scale — **not** shadcn's `primary`/`primary-soft` naming used inside `shift-app-hero`).

## Global Constraints

- Do not commit anything — the user will commit explicitly when ready (per direct instruction in this task).
- Do not modify `shift-app-hero/` — it is a design reference only.
- Do not create new Supabase migrations for this plan's scope — no task here requires a schema change (verified during investigation; see Implementation Map below).
- No hardcoded role-name checks (`role === 'Manager'`) — gate on `hasPermission(code)` / `branchAccess.isOrgWide`, matching the existing codebase-wide pattern (verified zero violations currently exist in `apps/web/src`).
- No fabricated backend success states — every RPC-backed action must reflect what actually happened.
- Reuse `apps/web`'s existing Tailwind token names (`brand-500`, `brand-50/100`, `success-500/50/600/text`, `neutral-50…900`) — do not introduce `shift-app-hero`'s shadcn CSS variable names (`primary`, `primary-soft`, `foreground`, `muted-foreground`, etc.) into `apps/web`.
- No component/unit test harness exists yet anywhere in this repo (verified: zero `*.test.*` files in `apps/web`, `packages/services`, or `packages/api` despite `jest` being configured). Follow the codebase's actual established verification pattern instead: `pnpm -w exec tsc -b`, `apps/web`'s own `tsc --noEmit`, then a real dev-server render check — do not invent a new test framework as part of this plan.
- Every RPC operation name is `verb_object` (API-002 §6) — matches `create_employee`, `update_organization`, etc.

---

## Implementation Map (from investigation — do not re-derive)

Three parallel investigations were run against the current uncommitted WIP, `shift-app-hero/`, and the real backend. Summary, so later tasks don't repeat this work:

**Already implemented and working (verified, do not touch):**
- Marketing pages (Landing/Features/Pricing/About/Request-Demo), Sign Up/Sign In/Password Reset, Organization/Branch/Supervisor onboarding steps, RoleDashboard + Manager/Supervisor/Employee dashboards, Sidebar/TopBar permission-based nav, MembersPage (correctly read-only), employee avatar upload (`AvatarUpload` + `lib/avatars.ts`, wired into `EmployeeFormPage`/`EmployeeDirectoryPage`/`EmployeeDetailPage`), Manager/Owner avatar upload on `ProfilePage`, permission catalog migrations 028/029, shared Tailwind/brand tokens between `shift-app-hero` and `apps/web`.
- `OnboardingGate`'s branch-existence check in `App.tsx` is a deliberate migration-safety shim (documented inline), not a bug — leave as-is.
- `ResourcesPage.tsx`'s lack of clickable article cards is a deliberate, documented decision (no CMS backend, refuses to fabricate articles) — not a dead-button violation, since the cards aren't links. Leave as-is.
- `InvitationsPage.tsx`'s empty state and `MembersPage.tsx`'s read-only list correctly match real backend capability (member invite/role-change genuinely does not exist — blocked on `SUPABASE_SERVICE_ROLE_KEY` not being loaded into the RPC server by design). Leave as-is; this is a **documented, non-blocking backend gap for a future milestone**, not something to build now (adding service-role-gated invite issuance is a security-sensitive decision the user should make explicitly, separately).

**Real gaps this plan closes (Tasks 1–4 below):**
1. Shifty is wired in as a real, functional chat component (`apps/web/src/components/shifty/Shifty.tsx`) but renders a generic `lucide-react` `MessageCircle` icon instead of the actual mascot illustration — the 4 PNG assets in `shift-app-hero/src/assets/shifty-*.png` and its `mascot.tsx` primitives (`ShiftyMascot`/`ShiftyAvatar`/`ShiftyPanel`/`ShiftyNote`) were never ported. AGENTS.md's explicit requirement ("not merely a generic icon... an actual friendly mascot illustration") is unmet.
2. Once the mascot exists, it isn't yet shown *inside* the onboarding steps (only as the floating global helper) — the Lovable design shows per-step guidance panels and a success pose on completion.
3. `MarketingFooter.tsx` has 4 literal `href="#"` dead links (LinkedIn, Instagram, Privacy Policy, Terms & Conditions) — a real, narrow violation of "never leave a dead button."
4. `ProfilePage.tsx` (`:47`, `:62`) writes directly to `supabase.from('users').update(...)` from the browser instead of going through the RPC/service/repository layer every other domain uses — a real, narrow violation of "do not bypass services," and organizationId is already available at that call site so a real RPC path is straightforward.

**Explicitly NOT a gap (checked and ruled out — do not add tasks for these):**
- `SessionProvider.tsx:143`'s direct `supabase.from('users').insert(...)` — this runs during first-login profile bootstrap, before any organization exists, so it cannot go through `createApplicationContext()` (which requires an `organizationId` and resolves org membership). This mirrors the existing, intentional precedent in `OrganizationSetupPage.tsx` (`create_organization_with_owner` is also called directly via Supabase for the same reason — no org exists yet to scope an RPC context to). Leave as-is.
- Employee avatar upload UI — already fully wired (confirmed by reading `EmployeeFormPage.tsx:6-8,40,54,116,121-140`), not a gap.
- Onboarding step naming (user's message describes "Organization → Branch → Departments → Employees → Finish"; what's built is "Organization (separate gate) → Branch → Supervisor → Departments → Finish"). This is a genuine naming/ordering discrepancy worth a decision, but not a functional gap: `SupervisorStep` already serves as the "add your first team member" step the original Lovable brief called "Employees" before it was renamed to "Supervisor." **Flagging for the user in the final report rather than guessing at a rebuild** — reordering or renaming risks being wrong in a different way than doing nothing.

**Requires a database change:** none for this plan.
**Should remain future scope (do not build):** Attendance/Tasks/Announcements/Notifications (Tier 2, zero permissions seeded), member invitation via Supabase Auth admin API (security decision), full mobile redesign, marketing-page content-parity pass (shift-app-hero's marketing pages run longer than `apps/web`'s ported versions — could be intentional simplification, not necessarily a gap; flagged for user judgment, not auto-expanded here).

---

## Task 1: Port the Shifty mascot asset & component library

**Files:**
- Create: `apps/web/src/assets/shifty-wave.png`, `apps/web/src/assets/shifty-guide.png`, `apps/web/src/assets/shifty-success.png`, `apps/web/src/assets/shifty-avatar.png` (byte-copy from `shift-app-hero/src/assets/shifty-*.png` — same filenames)
- Create: `apps/web/src/components/shifty/mascot.tsx`
- Test: none (no test harness exists for `apps/web` components — see Global Constraints)

**Interfaces:**
- Produces: `ShiftyVariant = 'wave' | 'guide' | 'success' | 'avatar'`; `ShiftyMascot({ variant?, className?, alt? }): React.ReactElement`; `ShiftyAvatar({ className?, online? }): React.ReactElement`; `ShiftyPanel({ variant?, eyebrow?, message, tips?, tone?, className? }): React.ReactElement`; `ShiftyNote({ children, tone?, className? }): React.ReactElement` — all from `apps/web/src/components/shifty/mascot.tsx`. Task 2 consumes all four.

- [ ] **Step 1: Copy the four mascot PNGs**

```bash
cp shift-app-hero/src/assets/shifty-wave.png apps/web/src/assets/shifty-wave.png
cp shift-app-hero/src/assets/shifty-guide.png apps/web/src/assets/shifty-guide.png
cp shift-app-hero/src/assets/shifty-success.png apps/web/src/assets/shifty-success.png
cp shift-app-hero/src/assets/shifty-avatar.png apps/web/src/assets/shifty-avatar.png
```

(Create `apps/web/src/assets/` first if it doesn't exist.)

- [ ] **Step 2: Write `apps/web/src/components/shifty/mascot.tsx`**

```tsx
import * as React from 'react';
import { Check, Sparkles } from 'lucide-react';
import shiftyWave from '../../assets/shifty-wave.png';
import shiftyGuide from '../../assets/shifty-guide.png';
import shiftySuccess from '../../assets/shifty-success.png';
import shiftyAvatar from '../../assets/shifty-avatar.png';

export type ShiftyVariant = 'wave' | 'guide' | 'success' | 'avatar';

const SOURCES: Record<ShiftyVariant, string> = {
  wave: shiftyWave,
  guide: shiftyGuide,
  success: shiftySuccess,
  avatar: shiftyAvatar
};

/** The one and only Shifty. Same character everywhere — only the pose changes. */
export function ShiftyMascot({
  variant = 'guide',
  className = '',
  alt = 'Shifty, the ShiftOS setup assistant'
}: {
  variant?: ShiftyVariant;
  className?: string;
  alt?: string;
}): React.ReactElement {
  return (
    <img
      src={SOURCES[variant]}
      alt={alt}
      width={816}
      height={816}
      loading="lazy"
      draggable={false}
      className={`select-none object-contain ${className}`}
    />
  );
}

/** Small circular Shifty face — used in headers, chat bubbles and list rows. */
export function ShiftyAvatar({ className = '', online = false }: { className?: string; online?: boolean }): React.ReactElement {
  return (
    <span className={`relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 ${className}`}>
      <ShiftyMascot variant="avatar" className="h-full w-full scale-[1.15]" alt="Shifty" />
      {online ? <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-success-500" /> : null}
    </span>
  );
}

/** Shifty speaking to the user — onboarding step guidance, tips, celebration. */
export function ShiftyPanel({
  variant = 'guide',
  eyebrow = 'Shifty',
  message,
  tips,
  tone = 'neutral',
  className = ''
}: {
  variant?: ShiftyVariant;
  eyebrow?: string;
  message: React.ReactNode;
  tips?: { label: string; hint: string }[];
  tone?: 'neutral' | 'success' | 'warning';
  className?: string;
}): React.ReactElement {
  const toneClass =
    tone === 'success' ? 'border-success-500/25 bg-success-50' : tone === 'warning' ? 'border-brand-300 bg-brand-50' : 'border-neutral-200 bg-white';

  return (
    <section aria-label="Shifty guidance" className={`rounded-2xl border p-4 shadow-sm ${toneClass} ${className}`}>
      <div className="flex items-start gap-3">
        <span className="relative flex size-16 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-brand-50">
          <ShiftyMascot variant={variant} className="h-[86%] w-full" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-600">
            <Sparkles size={12} aria-hidden="true" /> {eyebrow}
          </p>
          <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-neutral-900">{message}</p>
        </div>
      </div>

      {tips && tips.length > 0 ? (
        <ul className="mt-3.5 space-y-2 border-t border-neutral-200 pt-3.5">
          {tips.map((t) => (
            <li key={t.label} className="flex items-start gap-2">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <Check size={10} aria-hidden="true" />
              </span>
              <span className="min-w-0 text-[12px] leading-relaxed text-neutral-500">
                <span className="font-bold text-neutral-900">{t.label}</span> — {t.hint}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Compact inline Shifty note — for validation hints and in-form nudges. */
export function ShiftyNote({
  children,
  tone = 'warning',
  className = ''
}: {
  children: React.ReactNode;
  tone?: 'warning' | 'success' | 'neutral';
  className?: string;
}): React.ReactElement {
  const toneClass =
    tone === 'warning' ? 'border-brand-200 bg-brand-50 text-neutral-900' : tone === 'success' ? 'border-success-500/25 bg-success-50 text-neutral-900' : 'border-neutral-200 bg-neutral-50 text-neutral-500';

  return (
    <p role="status" className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold leading-relaxed ${toneClass} ${className}`}>
      <ShiftyAvatar className="size-7" />
      <span className="min-w-0 pt-0.5">{children}</span>
    </p>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json`
Expected: exits 0, no errors referencing `mascot.tsx`.

---

## Task 2: Replace the generic Shifty icon and wire mascot guidance into onboarding

**Files:**
- Modify: `apps/web/src/components/shifty/Shifty.tsx`
- Modify: `apps/web/src/pages/onboarding/OnboardingWizard.tsx`

**Interfaces:**
- Consumes: `ShiftyMascot`, `ShiftyAvatar`, `ShiftyPanel` from Task 1's `apps/web/src/components/shifty/mascot.js` (note `.js` extension in the import — matches this codebase's existing ESM import convention, e.g. `Shifty.js` imports across the repo).

- [ ] **Step 1: Replace the generic icon in `Shifty.tsx`**

In `apps/web/src/components/shifty/Shifty.tsx`:
- Add `import { ShiftyAvatar, ShiftyMascot } from './mascot.js';`
- Remove the now-unused `MessageCircle` import from `lucide-react` (keep `Sparkles`, `X` if still used elsewhere in the file, or drop `Sparkles` too since the header will use `ShiftyAvatar` instead).
- Replace the launcher button's icon:

```tsx
// before
<button ... className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600">
  <MessageCircle size={22} />
</button>

// after
<button ... className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 shadow-lg hover:bg-brand-600">
  <ShiftyMascot variant="avatar" className="size-9 rounded-full" />
</button>
```

- Replace the panel header row (currently `<Sparkles size={16} /><span>Shifty</span>`) with:

```tsx
<div className="flex items-center gap-2">
  <ShiftyAvatar online className="size-8 bg-white" />
  <span className="text-sm font-semibold">Shifty</span>
</div>
```

- In the empty-state message block (`messages.length === 0 ? <p>Ask me about...</p> : ...`), add a wave illustration above the existing text:

```tsx
{messages.length === 0 ? (
  <div className="flex flex-col items-center gap-2 py-2 text-center">
    <span className="flex size-16 items-end justify-center overflow-hidden rounded-2xl bg-brand-50">
      <ShiftyMascot variant="wave" className="h-[88%] w-full" />
    </span>
    <p className="text-sm text-neutral-500">Ask me about branches, schedules, employees, or invitations.</p>
  </div>
) : (
  // ...existing messages rendering unchanged
)}
```

- [ ] **Step 2: Add per-step `ShiftyPanel` guidance inside `OnboardingWizard.tsx`**

In `apps/web/src/pages/onboarding/OnboardingWizard.tsx`:
- Add `import { ShiftyPanel } from '../../components/shifty/mascot.js';`
- Extend `STEP_GUIDANCE` (already keyed by `Step`) with a `variant` per step, reusing the existing `title`/`message`:

```tsx
const STEP_GUIDANCE: Record<Step, { title: string; message: string; variant: 'wave' | 'guide' | 'success' }> = {
  branch: { title: 'Set up your branch', message: 'Branches are how ShiftOS organizes locations, schedules, and staff. You can add more later.', variant: 'wave' },
  supervisor: {
    title: 'Add a supervisor',
    message: "You can add your first supervisor as a team member now. Giving them their own sign-in requires invitations, which aren't available yet.",
    variant: 'guide'
  },
  departments: { title: 'Departments', message: "Department support isn't built yet — for now, ShiftOS organizes your team by branch.", variant: 'guide' },
  finish: { title: "You're almost done", message: 'Once you finish, you will land on your real dashboard with live data.', variant: 'success' }
};
```

- Inside the `<Card className="p-8">` block, before the step switch, render the panel using the current step's guidance:

```tsx
<Card className="p-8">
  <ShiftyPanel variant={STEP_GUIDANCE[step].variant} message={STEP_GUIDANCE[step].message} className="mb-6" />
  {step === 'branch' ? <BranchStep onNext={() => setStep('supervisor')} /> : null}
  {/* ...unchanged */}
</Card>
```

- In `FinishStep`, replace the `PartyPopper` icon block with the success mascot pose:

```tsx
// before
<div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-600">
  <PartyPopper size={26} />
</div>

// after
<span className="flex size-20 items-end justify-center overflow-hidden rounded-2xl bg-success-50">
  <ShiftyMascot variant="success" className="h-[88%] w-full" />
</span>
```

(Remove the now-unused `PartyPopper` import from `lucide-react` if nothing else in the file uses it; add `import { ShiftyMascot } from '../../components/shifty/mascot.js';` alongside the `ShiftyPanel` import.)

- [ ] **Step 3: Typecheck and build**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json`
Expected: exits 0.

Run: `pnpm -w exec tsc -b` (from repo root)
Expected: exits 0.

- [ ] **Step 4: Manual verification**

Run: `pnpm --filter @shiftos/web dev`, open the app, sign in with a fresh/onboarding-eligible account (or an account with no branches yet), and visually confirm:
- The floating Shifty launcher shows the mascot avatar, not a chat-bubble icon.
- Opening Shifty shows the mascot in the header and the wave pose in the empty state.
- Each onboarding step (branch/supervisor/departments/finish) shows a `ShiftyPanel` guidance card with the correct pose, and the Finish step shows the success pose instead of the confetti icon.

---

## Task 3: Fix the 4 dead footer links

**Files:**
- Modify: `apps/web/src/marketing/MarketingFooter.tsx`
- Create: `apps/web/src/pages/marketing/PrivacyPage.tsx`
- Create: `apps/web/src/pages/marketing/TermsPage.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Produces: two new public routes `/privacy` and `/terms`, each a default-exported React component matching the existing marketing page shape (`AboutPage.tsx`/`ResourcesPage.tsx` pattern: wrapped in `MarketingLayout`, using `Eyebrow`/`SectionHeading` from `../../marketing/components.js`).

- [ ] **Step 1: Remove the two fabricated social links**

In `apps/web/src/marketing/MarketingFooter.tsx`, delete the LinkedIn and Instagram `<a href="#">` blocks (lines ~45-50) — no real ShiftOS social profile URLs exist yet, and linking to `#` is a dead button while linking to a made-up URL would be fabrication. Keep the `mailto:hello@shiftos.app` icon, which is real. Remove the now-unused `Linkedin`/`Instagram` imports from `lucide-react` if nothing else in the file uses them.

- [ ] **Step 2: Write minimal, honest Privacy and Terms pages**

`apps/web/src/pages/marketing/PrivacyPage.tsx`:

```tsx
import React from 'react';
import { Mail } from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Eyebrow } from '../../marketing/components.js';

export default function PrivacyPage(): React.ReactElement {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <Eyebrow>Privacy Policy</Eyebrow>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-neutral-900">Privacy Policy</h1>
        <p className="mt-6 text-sm leading-relaxed text-neutral-500">
          ShiftOS is still finalizing its formal privacy policy. In the meantime, we only collect the account and
          workforce data you provide directly to operate scheduling for your organization, and we do not sell it.
          For specific questions about how your data is handled, contact us directly.
        </p>
        <a
          href="mailto:hello@shiftos.app"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Mail size={16} /> Email Us
        </a>
      </section>
    </MarketingLayout>
  );
}
```

`apps/web/src/pages/marketing/TermsPage.tsx` (same shape, swap copy):

```tsx
import React from 'react';
import { Mail } from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Eyebrow } from '../../marketing/components.js';

export default function TermsPage(): React.ReactElement {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <Eyebrow>Terms &amp; Conditions</Eyebrow>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-neutral-900">Terms &amp; Conditions</h1>
        <p className="mt-6 text-sm leading-relaxed text-neutral-500">
          ShiftOS's formal terms of service are still being finalized as the product moves toward general
          availability. If you need contractual terms for an active or pending engagement, contact us directly and
          we'll provide them.
        </p>
        <a
          href="mailto:hello@shiftos.app"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Mail size={16} /> Email Us
        </a>
      </section>
    </MarketingLayout>
  );
}
```

- [ ] **Step 3: Wire the routes and footer links**

In `apps/web/src/App.tsx`, add two lazy imports next to the other marketing pages and two routes in the unauthenticated `<Routes>` block:

```tsx
const PrivacyPage = lazy(() => import('./pages/marketing/PrivacyPage.js'));
const TermsPage = lazy(() => import('./pages/marketing/TermsPage.js'));
```

```tsx
<Route path="/privacy" element={<PrivacyPage />} />
<Route path="/terms" element={<TermsPage />} />
```

In `apps/web/src/marketing/MarketingFooter.tsx`, replace the two `<a href="#">` legal links with real `<Link>`s:

```tsx
<Link to="/privacy" className="hover:text-neutral-900">Privacy Policy</Link>
<Link to="/terms" className="hover:text-neutral-900">Terms &amp; Conditions</Link>
```

(`Link` is already imported in this file from `react-router-dom`.)

- [ ] **Step 4: Typecheck and verify**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json`
Expected: exits 0.

Run: `pnpm --filter @shiftos/web dev`, visit `/privacy` and `/terms` directly, and click both links from the footer of any marketing page to confirm navigation works and no `#` links remain in `MarketingFooter.tsx`.

---

## Task 4: Route profile self-edits through a real RPC operation instead of direct table writes

**Files:**
- Create: `packages/services/src/identity/userService.ts`
- Modify: `packages/services/src/index.ts`
- Create: `packages/api/src/operations/user.ts`
- Modify: `packages/api/src/index.ts`
- Modify: `packages/api/src/registry.ts`
- Modify: `apps/web/src/pages/account/ProfilePage.tsx`

**Interfaces:**
- Produces: `UserService.updateMyProfile(patch: { firstName?: string; lastName?: string; phone?: string | null; avatarUrl?: string | null }): Promise<User>` (from `packages/services`); RPC operation `update_profile` accepting `{ firstName?, lastName?, phone?, avatarUrl? }`, returning the updated `User`.
- Consumes: `ApplicationContext.userId` / `.client` (already defined in `packages/services/src/applicationContext.ts`), `UserRepository` (`packages/repositories/src/identity/userRepository.ts`, already has `.update(id, changes): Promise<User>` via `BaseRepository`), `defineRpc`/`asRecord`/`stringField` (`packages/api/src/rpc.ts`, `packages/api/src/parse.ts` — same helpers `employee.ts` uses), `useRpcMutation` (`apps/web/src/lib/useRpc.ts`).

- [ ] **Step 1: Write `packages/services/src/identity/userService.ts`**

```ts
import { UserRepository, type User } from '@shiftos/repositories';
import type { ApplicationContext } from '../applicationContext.js';

/**
 * Self-service profile updates only. No permission check: the security
 * boundary here is identity, not capability — this always writes to
 * context.userId (the caller's own row), never an id supplied by the
 * client. users is platform identity, not organization-scoped (DEC-016),
 * so org.* permissions don't apply to it.
 */
export class UserService {
  private readonly users: UserRepository;

  constructor(private readonly context: ApplicationContext) {
    this.users = new UserRepository(this.context.client);
  }

  async updateMyProfile(patch: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    avatarUrl?: string | null;
  }): Promise<User> {
    const changes: Partial<User> = {};
    if (patch.firstName !== undefined) changes.first_name = patch.firstName;
    if (patch.lastName !== undefined) changes.last_name = patch.lastName;
    if (patch.phone !== undefined) changes.phone = patch.phone;
    if (patch.avatarUrl !== undefined) changes.avatar_url = patch.avatarUrl;
    return this.users.update(this.context.userId, changes);
  }
}
```

- [ ] **Step 2: Export it**

In `packages/services/src/index.ts`, add:

```ts
export * from './identity/userService.js';
```

- [ ] **Step 3: Write `packages/api/src/operations/user.ts`**

```ts
import { UserService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, stringField } from '../parse.js';

export const updateProfile = defineRpc('update_profile', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new UserService(context).updateMyProfile({
    firstName: stringField(input, 'firstName'),
    lastName: stringField(input, 'lastName'),
    phone: stringField(input, 'phone') ?? (input.phone === null ? null : undefined),
    avatarUrl: stringField(input, 'avatarUrl') ?? (input.avatarUrl === null ? null : undefined)
  });
});

export const userOperations = [updateProfile];
```

- [ ] **Step 4: Register the operation**

In `packages/api/src/index.ts`, add:

```ts
export * from './operations/user.js';
```

In `packages/api/src/registry.ts`, add the import alongside the others:

```ts
import { updateProfile } from './operations/user.js';
```

and register it (e.g. near `getMyContext`):

```ts
registry.register(updateProfile);
```

- [ ] **Step 5: Update `ProfilePage.tsx` to call the RPC instead of writing to Supabase directly**

In `apps/web/src/pages/account/ProfilePage.tsx`:
- Remove the `import { supabase } from '../../lib/supabase.js';` line (no longer needed in this file).
- Add `import { useRpcMutation } from '../../lib/useRpc.js';` alongside the existing `useRpcQuery` import (merge into one import line).
- Add a mutation and use it in both `handleSubmit` and `updateAvatar`:

```tsx
const updateProfileMutation = useRpcMutation<{ id: string }, { firstName?: string; lastName?: string; phone?: string | null; avatarUrl?: string | null }>(
  'update_profile'
);

const handleSubmit = async (event: React.FormEvent): Promise<void> => {
  event.preventDefault();
  if (!profile) return;
  if (!firstName.trim() || !lastName.trim()) {
    setError('First and last name are required.');
    return;
  }
  setSaving(true);
  setError(null);
  setSaved(false);
  try {
    await updateProfileMutation.mutateAsync({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || null });
    setSaved(true);
    await refresh();
  } catch {
    setError('Could not save your changes. Please try again.');
  } finally {
    setSaving(false);
  }
};

const updateAvatar = async (newPath: string | null): Promise<void> => {
  if (!profile) return;
  await updateProfileMutation.mutateAsync({ avatarUrl: newPath });
  await refresh();
};
```

(`useRpcMutation` already surfaces `mutateAsync` via `@tanstack/react-query`'s `useMutation` — confirmed by its definition in `apps/web/src/lib/useRpc.ts`.)

- [ ] **Step 6: Typecheck and build**

Run: `pnpm -w exec tsc -b` (from repo root)
Expected: exits 0 — this exercises `packages/services`, `packages/api`, and `apps/web` together, catching any signature mismatch across the three new/modified files.

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json`
Expected: exits 0.

- [ ] **Step 7: Manual verification**

Run: `pnpm --filter @shiftos/web dev`, sign in, go to `/profile`, change your first/last name and phone, save, and confirm the change persists after a refresh. Then upload a new avatar and confirm it also persists. Both should now go through the real `update_profile` RPC (visible in the network tab as a call to the RPC endpoint, not a direct Supabase REST call to `/rest/v1/users`).

---

## Task 5: Full verification pass and final report

**Files:** none (verification only).

- [ ] **Step 1: Full workspace build**

```bash
pnpm install
pnpm -w exec tsc -b --force
pnpm -w exec tsc -p tsconfig.json --noEmit
```

Expected: all exit 0.

- [ ] **Step 2: Start the app and click through every surface changed by Tasks 1–4**

```bash
pnpm --filter @shiftos/web dev
```

Verify in a real browser:
- Landing page loads; header/footer navigation works; `/privacy` and `/terms` render and no `#` links remain.
- Sign-up/sign-in/reset-password screens render.
- A fresh org walks through onboarding (branch → supervisor → departments → finish) and each step shows the real Shifty mascot guidance panel; Finish shows the success pose.
- The floating Shifty launcher/panel shows the real mascot everywhere it appears (marketing pages via `AppShell`/onboarding, and inside the authenticated app).
- Manager, Supervisor, and Employee dashboards each render for an account with the matching capability signal.
- Employee list/detail/create/edit screens still show avatars correctly (regression check — Task 4 did not touch employee avatars, only the user's own profile).
- `/profile`: edit name/phone/avatar, refresh, confirm persistence via the new `update_profile` RPC.

- [ ] **Step 3: Write the final report**

Produce the 20-point report the user requested (Lovable integration status; public/marketing pages; auth; onboarding; Shifty; Manager/Supervisor/Staff dashboards; employee/avatar status; Manager settings/profile; scheduling; backend-connected vs. frontend-only functionality; missing backend capabilities; database changes made (none); authorization/security findings; test/build results; runtime validation results; remaining blockers; recommended next milestone). Base it on:
- The Implementation Map above (what was already done, verified during investigation).
- Tasks 1–4 (what this plan closed).
- The "Explicitly NOT a gap" section (documented judgment calls, not oversights).
- The "Should remain future scope" section (member invitation via admin API, Tier-2 domains, onboarding step-naming discrepancy needing a user decision, marketing content-parity) as the recommended next milestone candidates.

---

## Self-Review Notes

- **Spec coverage:** STEP 1 (investigation) → Implementation Map. STEP 2/14 (Lovable visual integration) → mostly already done; Task 1/2 close the one real gap (Shifty). STEP 3/4 (entry flow, onboarding) → already correct; documented, not re-built. STEP 5 (Shifty) → Tasks 1–2. STEP 6 (dashboards) → already correct, verified, no task needed. STEP 7 (avatars) → already correct, verified, no task needed. STEP 8 (settings/profile) → Task 4. STEP 9/10 (buttons/missing screens) → Task 3 (footer) covers the only real dead buttons found; no other missing-screen gaps survived investigation. STEP 11 (real backend connection) → Task 4 is the only violation found. STEP 12 (DB changes) → none required, stated explicitly. STEP 13 (authorization) → verified clean, no hardcoded role checks exist. STEP 15 (mobile) → untouched, no task. STEP 16 (testing) → Task 5.
- **Placeholder scan:** no TBD/"add validation"/"similar to Task N" language used; every step has literal code or literal commands.
- **Type consistency:** `UserService.updateMyProfile`'s patch shape matches the RPC operation's parsed input shape matches `ProfilePage.tsx`'s mutation input type exactly (`firstName?`, `lastName?`, `phone?: string | null`, `avatarUrl?: string | null`) across Task 4's three files.
