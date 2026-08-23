# Auth Phase Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild ShiftOS's 7 in-scope auth screens (Sign In, Sign Up, Forgot Password, Reset Password, Verify Email, Accept Invitation, Complete Profile) against `design_handoff_shiftos/ShiftOS Auth.dc.html`, on top of the canonical design tokens already established, wired to the real Supabase auth backend that already exists — plus the two small backend additions the new designs need.

**Architecture:** A new shared `AuthShell` (dark left brand panel + 462px form card) and `AuthStatusPanel` (success/network-error/expired/used states) replace the two existing ad-hoc shells (`AuthMarketingLayout.tsx`, `AuthLayout.tsx`) for these 7 screens. Password-rule logic is extracted once into `lib/password.ts` + `PasswordStrengthMeter.tsx` and reused by the 3 screens that need it. One new migration adds `users.job_title` and a read-only `get_pending_invitation()` RPC (mirroring the existing `accept_invitation()` pattern).

**Tech Stack:** React 18, react-router-dom v6, Tailwind (via `@shiftos/ui` tokens), `@supabase/supabase-js` v2.45, lucide-react, Postgres/Supabase (SECURITY DEFINER functions, RLS).

**Spec:** `docs/superpowers/specs/2026-08-23-auth-phase-rebuild-design.md`

## Global Constraints

- No Role selector on Sign Up — self-service signup always creates the org Owner; other roles only ever come from invitations.
- No "Admin Invitation" screen — deferred to the future Admin-console phase (no Admin role exists in the backend).
- Copy for every screen's brand panel (eyebrow/title/accent/body/highlight/benefits) must match `Local file check/design_handoff_shiftos/ShiftOS Auth.dc.html`'s `CFG` object exactly (this plan copies the exact strings into each task).
- Reset Password keeps a single "expired" terminal state (no separate "used" state) — Supabase's client SDK cannot reliably distinguish the two for password recovery.
- `pnpm --filter @shiftos/web build` must stay clean after every task.
- Reuse existing `@shiftos/ui` components (`Button`, `Input`, `FormField`, `InlineError`) and `lucide-react` icons — no new dependencies.
- `AuthLayout.tsx` must **not** be deleted — `apps/web/src/pages/onboarding/OrganizationSetupPage.tsx` still depends on it and onboarding is a separate, not-yet-started phase.

---

## Task 1: Shared password rules + strength meter

**Files:**
- Create: `apps/web/src/lib/password.ts`
- Create: `apps/web/src/pages/auth/PasswordStrengthMeter.tsx`
- Modify: `apps/web/src/pages/auth/ResetPasswordPage.tsx:1-34` (remove the now-duplicated inline `checklistFor`/`strengthFor`/types, import from the new module instead)

**Interfaces:**
- Produces: `checklistFor(password: string): PasswordCheck[]`, `strengthFor(checks: PasswordCheck[]): PasswordStrength`, `PasswordCheck { label: string; passed: boolean }`, `PasswordStrength { label: 'Weak' | 'Fair' | 'Strong'; color: string; ratio: number }`, `<PasswordStrengthMeter checks={checks} strength={strength} />`.

- [ ] **Step 1: Create `apps/web/src/lib/password.ts`**

```ts
export interface PasswordCheck {
  label: string;
  passed: boolean;
}

export interface PasswordStrength {
  label: 'Weak' | 'Fair' | 'Strong';
  color: string;
  ratio: number;
}

/** The 4 rules shown on Sign Up, Reset Password and Accept Invitation (design's RULES constant). */
export function checklistFor(password: string): PasswordCheck[] {
  return [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'One number', passed: /[0-9]/.test(password) }
  ];
}

export function strengthFor(checks: PasswordCheck[]): PasswordStrength {
  const passed = checks.filter((c) => c.passed).length;
  if (passed <= 1) return { label: 'Weak', color: 'bg-error-500', ratio: 0.33 };
  if (passed <= 3) return { label: 'Fair', color: 'bg-warning-500', ratio: 0.66 };
  return { label: 'Strong', color: 'bg-success-500', ratio: 1 };
}
```

- [ ] **Step 2: Create `apps/web/src/pages/auth/PasswordStrengthMeter.tsx`**

```tsx
import React from 'react';
import { Check, X } from 'lucide-react';
import type { PasswordCheck, PasswordStrength } from '../../lib/password.js';

export function PasswordStrengthMeter({
  checks,
  strength
}: {
  checks: PasswordCheck[];
  strength: PasswordStrength;
}): React.ReactElement {
  return (
    <div className="rounded-xl bg-brand-50 p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-neutral-700">Password strength</span>
        <span
          className={
            strength.label === 'Strong'
              ? 'font-semibold text-success-600'
              : strength.label === 'Fair'
                ? 'font-semibold text-warning-600'
                : 'font-semibold text-error-600'
          }
        >
          {strength.label}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className={['h-full rounded-full transition-all', strength.color].join(' ')} style={{ width: `${strength.ratio * 100}%` }} />
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {checks.map((check) => (
          <li key={check.label} className={['flex items-center gap-1.5 text-xs', check.passed ? 'text-success-700' : 'text-neutral-400'].join(' ')}>
            {check.passed ? <Check size={13} /> : <X size={13} />}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Update `ResetPasswordPage.tsx` to import from the shared module**

Remove lines 15-34 (the `PasswordCheck` interface, `checklistFor`, `strengthFor`) and replace the import block at the top with:

```tsx
import { checklistFor, strengthFor } from '../../lib/password.js';
```

Leave the rest of `ResetPasswordPage.tsx` untouched for this task — it gets its full `AuthShell`/`AuthStatusPanel` rebuild in Task 9. This step only removes the duplication so both files compile against one source of truth.

- [ ] **Step 4: Verify build**

Run: `pnpm --filter @shiftos/web build`
Expected: builds clean, no TS errors about missing `checklistFor`/`strengthFor`/`PasswordCheck`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/password.ts apps/web/src/pages/auth/PasswordStrengthMeter.tsx apps/web/src/pages/auth/ResetPasswordPage.tsx
git commit -m "refactor(auth): extract shared password rules and strength meter"
```

---

## Task 2: Network-error detection helper

**Files:**
- Create: `apps/web/src/lib/authErrors.ts`

**Interfaces:**
- Produces: `isNetworkError(error: unknown): boolean`

- [ ] **Step 1: Create `apps/web/src/lib/authErrors.ts`**

```ts
/**
 * Supabase-js v2 wraps a genuine fetch/network failure as
 * AuthRetryableFetchError (auth-js), distinct from a normal AuthError
 * (wrong password, expired link, etc). Used to render AuthStatusPanel's
 * "Network error" tone instead of a validation/auth error — these auth
 * calls don't go through apiClient.ts's existing NETWORK_ERROR handling,
 * which only covers the Tier-1 callRpc path.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String((error as { name: unknown }).name) : '';
  if (name === 'AuthRetryableFetchError') return true;
  const message = 'message' in error ? String((error as { message: unknown }).message).toLowerCase() : '';
  return message.includes('failed to fetch') || message.includes('network');
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @shiftos/web build`
Expected: builds clean (new file has no consumers yet, but must type-check standalone).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/authErrors.ts
git commit -m "feat(auth): add network-error detection helper"
```

---

## Task 3: `AuthStatusPanel` component

**Files:**
- Create: `apps/web/src/pages/auth/AuthStatusPanel.tsx`

**Interfaces:**
- Consumes: `Button` from `@shiftos/ui` (existing: `variant`, `size`, `loading`, `onClick`, `children`).
- Produces: `<AuthStatusPanel icon tone title body meta? ctaLabel onCta ctaLoading? secondaryLabel? onSecondary? />`, `AuthStatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'primary'`.

- [ ] **Step 1: Create `apps/web/src/pages/auth/AuthStatusPanel.tsx`**

```tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@shiftos/ui';

export type AuthStatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'primary';

const TONE_CLASSES: Record<AuthStatusTone, { bg: string; fg: string }> = {
  ok: { bg: 'bg-success-50', fg: 'text-success-600' },
  warn: { bg: 'bg-warning-50', fg: 'text-warning-600' },
  bad: { bg: 'bg-error-50', fg: 'text-error-600' },
  info: { bg: 'bg-info-50', fg: 'text-info-600' },
  primary: { bg: 'bg-brand-soft', fg: 'text-brand-deep' }
};

export interface AuthStatusPanelProps {
  icon: LucideIcon;
  tone: AuthStatusTone;
  title: string;
  body: string;
  meta?: string;
  ctaLabel: string;
  onCta: () => void;
  ctaLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * Shared renderer for every screen's non-idle terminal views (Success,
 * Network error, Expired link, Used link) per design_handoff_shiftos's
 * STATES/TONES. Validation errors stay inline (InlineError); Loading stays
 * the submit button's own `loading` prop — neither goes through this panel.
 */
export function AuthStatusPanel({
  icon: Icon,
  tone,
  title,
  body,
  meta,
  ctaLabel,
  onCta,
  ctaLoading = false,
  secondaryLabel,
  onSecondary
}: AuthStatusPanelProps): React.ReactElement {
  const toneClasses = TONE_CLASSES[tone];
  return (
    <div className="py-6 text-center">
      <div className={['mx-auto flex h-14 w-14 items-center justify-center rounded-full', toneClasses.bg, toneClasses.fg].join(' ')}>
        <Icon size={26} />
      </div>
      <h2 className="mt-4 text-xl font-bold text-neutral-900">{title}</h2>
      <p className="mt-2 text-sm text-neutral-500">{body}</p>
      {meta ? <p className="mt-2 text-xs text-neutral-400">{meta}</p> : null}
      <div className="mt-6 flex flex-col items-center gap-3">
        <Button type="button" size="lg" fullWidth onClick={onCta} loading={ctaLoading}>
          {ctaLabel}
        </Button>
        {secondaryLabel && onSecondary ? (
          <button type="button" onClick={onSecondary} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @shiftos/web build`
Expected: builds clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/auth/AuthStatusPanel.tsx
git commit -m "feat(auth): add shared AuthStatusPanel component"
```

---

## Task 4: `AuthShell` component

**Files:**
- Create: `apps/web/src/pages/auth/AuthShell.tsx`

**Interfaces:**
- Consumes: `Logo` from `../../marketing/Logo.js` (existing: `size`, `to`, `inverted` props — `inverted` renders "Shift" in white for the dark panel).
- Produces: `<AuthShell eyebrow title accent body highlight? benefits topRightPrompt topRightLinkLabel topRightLinkTo? >{children}</AuthShell>`, `AuthBenefit { icon: React.ElementType; title: string; body: string }`, `AuthHighlight { icon: React.ElementType; title: string; body: string }`.

- [ ] **Step 1: Create `apps/web/src/pages/auth/AuthShell.tsx`**

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../marketing/Logo.js';

export interface AuthBenefit {
  icon: React.ElementType;
  title: string;
  body: string;
}

export interface AuthHighlight {
  icon: React.ElementType;
  title: string;
  body: string;
}

export interface AuthShellProps {
  eyebrow: string;
  title: string;
  accent: string;
  body: string;
  highlight?: AuthHighlight;
  benefits: AuthBenefit[];
  topRightPrompt: string;
  topRightLinkLabel: string;
  topRightLinkTo?: string;
  children: React.ReactNode;
}

/**
 * Shared two-column shell for every auth screen, matching
 * design_handoff_shiftos/ShiftOS Auth.dc.html: dark left brand panel
 * (eyebrow, title+accent, body, optional highlight callout, 4-item benefits
 * list) + a max-width-462px white form card on the right. Below ~720px the
 * brand panel hides and the form goes full width (design's own breakpoint —
 * approximated here at Tailwind's `lg` (1024px) since this app has no
 * existing 720px breakpoint token).
 */
export function AuthShell({
  eyebrow,
  title,
  accent,
  body,
  highlight,
  benefits,
  topRightPrompt,
  topRightLinkLabel,
  topRightLinkTo,
  children
}: AuthShellProps): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <div className="hidden shrink-0 flex-col justify-between bg-neutral-900 px-10 py-12 text-white lg:flex lg:w-[420px] xl:w-[460px]">
        <div>
          <Logo inverted />
          <p className="mt-10 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight">
            {title} <span className="text-brand-300">{accent}</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-neutral-300">{body}</p>

          {highlight ? (
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-300">
                <highlight.icon size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{highlight.title}</p>
                <p className="mt-0.5 text-sm text-neutral-300">{highlight.body}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-5">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-brand-300">
                  <benefit.icon size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{benefit.title}</p>
                  <p className="text-sm text-neutral-400">{benefit.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-4 py-6 sm:px-6 lg:justify-end lg:px-10">
          <div className="lg:hidden">
            <Logo />
          </div>
          <p className="text-sm text-neutral-500">
            {topRightPrompt}{' '}
            {topRightLinkTo ? (
              <Link to={topRightLinkTo} className="font-semibold text-brand-600 hover:text-brand-700">
                {topRightLinkLabel}
              </Link>
            ) : (
              <span className="font-semibold text-neutral-700">{topRightLinkLabel}</span>
            )}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
          <div className="w-full max-w-[462px] rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg">{children}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @shiftos/web build`
Expected: builds clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/auth/AuthShell.tsx
git commit -m "feat(auth): add shared AuthShell layout component"
```

---

## Task 5: Rebuild Sign In on `AuthShell`

**Files:**
- Modify: `apps/web/src/pages/auth/SignInPage.tsx` (full rewrite of the JSX/config; `handleSubmit`/`handleGoogleSignIn` logic unchanged)

**Interfaces:**
- Consumes: `AuthShell` (Task 4), `useSession().signIn` (existing, unchanged), `isNetworkError` (Task 2, wired for the network-error branch, rendered inline as `InlineError` since Sign In has no dedicated Success/Expired panel state — a failed sign-in of any kind stays on the form).

- [ ] **Step 1: Rewrite `apps/web/src/pages/auth/SignInPage.tsx`**

```tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarClock, MessageSquare, Clock3, Lock, ShieldCheck } from 'lucide-react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { supabase } from '../../lib/supabase.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { PasswordInput } from './PasswordInput.js';

const HIGHLIGHT: AuthHighlight = {
  icon: Lock,
  title: 'One account, one workspace',
  body: "You'll land in the branch and role your organization assigned to you."
};

const BENEFITS: AuthBenefit[] = [
  { icon: BarChart3, title: 'Access dashboard', body: "Your role's view, ready on sign-in." },
  { icon: Clock3, title: 'Live shift data', body: 'Attendance and tasks as they happen.' },
  { icon: CalendarClock, title: 'Manage schedules', body: 'Build, publish and adjust the week.' },
  { icon: MessageSquare, title: 'Branch updates', body: 'Announcements your team must read.' }
];

/** SHARED-001 — Sign In (WF-001). */
export default function SignInPage(): React.ReactElement {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) setError(signInError);
    } catch (err) {
      setError(isNetworkError(err) ? "Couldn't reach ShiftOS. Check your connection and try again." : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    setGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (oauthError) {
      setError('Google sign-in is not available right now.');
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Welcome Back. Access Your"
      accent="Workspace"
      body="Sign in to continue managing schedules, staff and daily operations from one secure platform."
      highlight={HIGHLIGHT}
      benefits={BENEFITS}
      topRightPrompt="Don't have an account?"
      topRightLinkLabel="Sign up"
      topRightLinkTo="/sign-up"
    >
      <h2 className="text-2xl font-bold text-neutral-900">Sign in to your account</h2>
      <p className="mt-1 text-sm text-neutral-500">Access your active workspace</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <FormField label="Work Email" htmlFor="email" required>
          {(fieldProps) => (
            <Input {...fieldProps} type="email" autoComplete="email" placeholder="Enter your work email" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </FormField>
        <div>
          <FormField label="Password" htmlFor="password" required>
            {(fieldProps) => (
              <PasswordInput
                {...fieldProps}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </FormField>
          <Link to="/forgot-password" className="mt-1.5 block text-right text-xs font-medium text-brand-600 hover:text-brand-700">
            Forgot Password?
          </Link>
        </div>
        {error ? <InlineError message={error} /> : null}
        <Button type="submit" loading={submitting} fullWidth size="lg">
          Sign in →
        </Button>

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          or
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <Button type="button" variant="secondary" fullWidth size="lg" onClick={() => void handleGoogleSignIn()} loading={googleLoading}>
          <GoogleIcon /> Continue with Google
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
          <ShieldCheck size={14} /> By signing in you agree to our Terms &amp; Conditions and Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}

function GoogleIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.5 0-14 4.1-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.9 39.8 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.5 35.9 44 30.4 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @shiftos/web build`
Expected: builds clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/auth/SignInPage.tsx
git commit -m "feat(auth): rebuild Sign In on AuthShell"
```

---

## Task 6: Rebuild Sign Up on `AuthShell`

**Files:**
- Modify: `apps/web/src/pages/auth/SignUpPage.tsx` (full rewrite of the JSX/config; `handleSubmit` logic unchanged except wrapping in try/catch for network errors)

**Interfaces:**
- Consumes: `AuthShell` (Task 4), `checklistFor`/`strengthFor` (Task 1), `PasswordStrengthMeter` (Task 1), `isNetworkError` (Task 2).

- [ ] **Step 1: Rewrite `apps/web/src/pages/auth/SignUpPage.tsx`**

```tsx
import React, { useMemo, useState } from 'react';
import { Building2, Calendar, Lock, Mail, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { checklistFor, strengthFor } from '../../lib/password.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { PasswordInput } from './PasswordInput.js';
import { PasswordStrengthMeter } from './PasswordStrengthMeter.js';

const HIGHLIGHT: AuthHighlight = {
  icon: Building2,
  title: 'One account. One organization workspace.',
  body: "Invite supervisors and staff once your branches are set up."
};

const BENEFITS: AuthBenefit[] = [
  { icon: Calendar, title: '30-day free trial', body: 'Explore every feature for 30 days.' },
  { icon: Lock, title: 'No credit card', body: 'Start instantly. No hidden fees.' },
  { icon: Users, title: 'Built for shift teams', body: 'Designed for managers and supervisors.' },
  { icon: MessageSquare, title: 'Support included', body: "We're here to help you get set up." }
];

/**
 * Not a screen in FD-4's numbered inventory — self-service signup is new
 * scope beyond the invitation-only model (DEC-017). Wired to real
 * `supabase.auth.signUp()`. The person who signs up here always becomes the
 * org "Owner" via WEB-001's create_organization_with_owner during onboarding
 * — there is no backend concept of choosing a role at signup (031: real
 * role assignment for anyone else happens exclusively through invitations).
 * The design file's Sign Up screen shows a Role selector; it is deliberately
 * omitted here (Auth phase design decision, 2026-08-23) since it has no
 * effect on anything and would imply a choice that doesn't exist.
 */
export default function SignUpPage(): React.ReactElement {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const checks = useMemo(() => checklistFor(password), [password]);
  const strength = useMemo(() => strengthFor(checks), [checks]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!fullName.trim() || !email || checks.some((c) => !c.passed)) {
      setError('Please fill in all required fields. Password must meet every requirement below.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    const lastName = rest.join(' ') || firstName;
    window.sessionStorage.setItem('shiftos.pendingName', JSON.stringify({ firstName, lastName, phone: whatsapp || undefined }));

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim(), whatsapp } }
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();
        if (message.includes('already registered') || message.includes('already exists')) {
          setError('An account with this email already exists.');
        } else if (message.includes('rate limit') || message.includes('too many') || message.includes('email send')) {
          setError('Too many sign-up attempts for this email right now. Please wait a few minutes and try again.');
        } else {
          setError('Something went wrong. Please try again.');
        }
        return;
      }
      if (!data.session) {
        setCheckEmail(true);
      }
      // If a session came back immediately (email confirmation disabled on
      // this Supabase project), SessionProvider's onAuthStateChange listener
      // picks it up and the app routes into CompleteProfilePage on its own.
    } catch (err) {
      setError(isNetworkError(err) ? "Couldn't reach ShiftOS. Check your connection and try again." : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Create your account"
      title="Run Your Shifts Without Spreadsheets"
      accent="or Chat-App Chaos"
      body="Create your organization workspace in minutes. Build schedules, keep staff informed and manage operations from one platform."
      highlight={HIGHLIGHT}
      benefits={BENEFITS}
      topRightPrompt="Already have an account?"
      topRightLinkLabel="Sign in"
      topRightLinkTo="/sign-in"
    >
      {checkEmail ? (
        <div className="py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
            <Mail size={26} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-neutral-900">Check your email</h2>
          <p className="mt-2 text-sm text-neutral-500">
            We sent a verification link to <strong>{email}</strong>. Verify it to continue setting up your organization.
          </p>
          <p className="mt-2 text-xs text-neutral-400">The link expires in 24 hours. You can request a new one at any time.</p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Create your account</h2>
          <p className="mt-1 text-sm text-neutral-500">Start your 30-day free trial. Cancel anytime.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <FormField label="Full Name" htmlFor="fullName" required>
              {(fieldProps) => <Input {...fieldProps} placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />}
            </FormField>
            <FormField label="Work Email" htmlFor="email" required>
              {(fieldProps) => (
                <Input {...fieldProps} type="email" autoComplete="email" placeholder="Enter your work email" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </FormField>
            <FormField label="WhatsApp Number" htmlFor="whatsapp" required>
              {(fieldProps) => (
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-sm text-neutral-600">+234</span>
                  <Input {...fieldProps} className="rounded-l-none" placeholder="801 234 5678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </div>
              )}
            </FormField>
            <FormField label="Password" htmlFor="password" required>
              {(fieldProps) => (
                <PasswordInput {...fieldProps} autoComplete="new-password" placeholder="Create your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              )}
            </FormField>
            {password ? <PasswordStrengthMeter checks={checks} strength={strength} /> : null}

            {error ? <InlineError message={error} /> : null}
            <Button type="submit" loading={submitting} fullWidth size="lg">
              Continue →
            </Button>

            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200" />
              or
              <span className="h-px flex-1 bg-neutral-200" />
            </div>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              size="lg"
              onClick={() => void supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
            >
              Continue with Google
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
              <ShieldCheck size={14} /> By creating an account you agree to our Terms &amp; Conditions and Privacy Policy.
            </p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @shiftos/web build`
Expected: builds clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/auth/SignUpPage.tsx
git commit -m "feat(auth): rebuild Sign Up on AuthShell"
```

---

## Task 7: Rebuild Forgot Password on `AuthShell` + `AuthStatusPanel`

**Files:**
- Modify: `apps/web/src/pages/auth/ForgotPasswordPage.tsx` (full rewrite)

**Interfaces:**
- Consumes: `AuthShell` (Task 4), `AuthStatusPanel` (Task 3), `isNetworkError` (Task 2).

- [ ] **Step 1: Rewrite `apps/web/src/pages/auth/ForgotPasswordPage.tsx`**

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, Lock, Mail, Users } from 'lucide-react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthStatusPanel } from './AuthStatusPanel.js';

const HIGHLIGHT: AuthHighlight = {
  icon: Clock3,
  title: 'Links expire in 20 minutes',
  body: "Short-lived links keep your organization's data safe if an inbox is shared."
};

const BENEFITS: AuthBenefit[] = [
  { icon: Mail, title: 'One email', body: 'Sent to the address on your account.' },
  { icon: Clock3, title: '20-minute window', body: 'Request a new link any time.' },
  { icon: Lock, title: 'Nothing changes yet', body: 'Your current password still works.' },
  { icon: Users, title: 'Need a hand?', body: 'Your manager can also reset it for you.' }
];

/** SHARED-002 — Forgot Password, styled to match Reset Password (SHARED-003). */
export default function ForgotPasswordPage(): React.ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const sendResetLink = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    setNetworkError(false);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      // Supabase never reveals whether the email is registered — always show
      // the same success state regardless of outcome (account-enumeration safe).
      if (!resetError) {
        setSent(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch (err) {
      if (isNetworkError(err)) setNetworkError(true);
      else setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!email) {
      setError('Enter your email.');
      return;
    }
    void sendResetLink();
  };

  return (
    <AuthShell
      eyebrow="Password help"
      title="Forgot Your"
      accent="Password?"
      body="Enter the work email on your ShiftOS account and we'll send a secure reset link. Your branch data stays untouched."
      highlight={HIGHLIGHT}
      benefits={BENEFITS}
      topRightPrompt="Remember your password?"
      topRightLinkLabel="Sign in"
      topRightLinkTo="/sign-in"
    >
      {networkError ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="Couldn't reach ShiftOS"
          body="Check your internet connection and try again."
          ctaLabel="Try again"
          ctaLoading={submitting}
          onCta={() => void sendResetLink()}
        />
      ) : sent ? (
        <AuthStatusPanel
          icon={Mail}
          tone="primary"
          title="Reset link sent"
          body="If that email belongs to a ShiftOS account, a reset link is on its way."
          meta="Didn't arrive within a few minutes? Check spam, or request another link."
          ctaLabel="Back to sign in"
          onCta={() => navigate('/sign-in')}
          secondaryLabel="Send another link"
          onSecondary={() => void sendResetLink()}
        />
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Reset your password</h2>
          <p className="mt-1 text-sm text-neutral-500">We&rsquo;ll email you a secure reset link.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <FormField label="Work Email" htmlFor="email" required>
              {(fieldProps) => (
                <Input {...fieldProps} type="email" autoComplete="email" placeholder="Enter your work email" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </FormField>
            {error ? <InlineError message={error} /> : null}
            <Button type="submit" loading={submitting} fullWidth size="lg">
              Send reset link →
            </Button>
            <p className="text-center text-xs text-neutral-400">
              For security we send the same confirmation whether or not the email is registered.
            </p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @shiftos/web build`
Expected: builds clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/auth/ForgotPasswordPage.tsx
git commit -m "feat(auth): rebuild Forgot Password on AuthShell"
```

---

## Task 8: Rebuild Reset Password on `AuthShell` + `AuthStatusPanel`

**Files:**
- Modify: `apps/web/src/pages/auth/ResetPasswordPage.tsx` (full rewrite, continuing from Task 1's import cleanup)

**Interfaces:**
- Consumes: `AuthShell` (Task 4), `AuthStatusPanel` (Task 3), `checklistFor`/`strengthFor` (Task 1), `PasswordStrengthMeter` (Task 1), `isNetworkError` (Task 2).

- [ ] **Step 1: Rewrite `apps/web/src/pages/auth/ResetPasswordPage.tsx`**

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Lock, ShieldCheck, User } from 'lucide-react';
import { Button, FormField, InlineError } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { checklistFor, strengthFor } from '../../lib/password.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthStatusPanel } from './AuthStatusPanel.js';
import { PasswordInput } from './PasswordInput.js';
import { PasswordStrengthMeter } from './PasswordStrengthMeter.js';

const HIGHLIGHT: AuthHighlight = {
  icon: ShieldCheck,
  title: "You're in control",
  body: 'Only you can access your account with your new password.'
};

const BENEFITS: AuthBenefit[] = [
  { icon: Lock, title: 'Secure & protected', body: 'Your password is encrypted at rest.' },
  { icon: User, title: "You're in control", body: 'Only you can access your account.' },
  { icon: ShieldCheck, title: 'Peace of mind', body: 'We can sign out all other devices.' },
  { icon: Clock3, title: '20-minute link', body: 'Expired links can be reissued.' }
];

type View = 'checking' | 'form' | 'expired' | 'success' | 'network-error';

/**
 * SHARED-003 — Reset Password. The design distinguishes "Expired link" from
 * "Used link", but Supabase's client SDK can't reliably tell those apart for
 * password recovery (no authoritative server-side status to check, unlike
 * Accept Invitation) — both collapse into a single "expired" state here, a
 * documented scope trim (see the Auth phase design spec).
 */
export default function ResetPasswordPage(): React.ReactElement {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setView(data.session ? 'form' : 'expired'));
  }, []);

  const checks = useMemo(() => checklistFor(password), [password]);
  const strength = useMemo(() => strengthFor(checks), [checks]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (checks.some((c) => !c.passed)) {
      setError('Your password does not meet all requirements yet.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (signOutOthers) {
        await supabase.auth.signOut({ scope: 'others' });
      }
      if (updateError) {
        setView('expired');
        return;
      }
      setView('success');
    } catch (err) {
      if (isNetworkError(err)) setView('network-error');
      else setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Secure password reset"
      title="Create a New"
      accent="Password"
      body="Your new password must be strong and unique to keep your ShiftOS account and branch data secure."
      highlight={HIGHLIGHT}
      benefits={BENEFITS}
      topRightPrompt="Remember your password?"
      topRightLinkLabel="Sign in"
      topRightLinkTo="/sign-in"
    >
      {view === 'checking' ? (
        <div className="py-16 text-center text-sm text-neutral-400">Checking your link…</div>
      ) : view === 'network-error' ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="Couldn't reach ShiftOS"
          body="Check your internet connection and try again."
          ctaLabel="Try again"
          onCta={() => setView('form')}
        />
      ) : view === 'expired' ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="This link has expired"
          body="For your security, password reset links expire after 20 minutes."
          ctaLabel="Request new link"
          onCta={() => navigate('/forgot-password')}
          secondaryLabel="Back to sign in"
          onSecondary={() => navigate('/sign-in')}
        />
      ) : view === 'success' ? (
        <AuthStatusPanel
          icon={CheckCircle2}
          tone="ok"
          title="Password updated successfully"
          body="Your password has been changed and all other devices have been signed out."
          ctaLabel="Continue to sign in →"
          onCta={() => navigate('/sign-in')}
        />
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Reset your password</h2>
          <p className="mt-1 text-sm text-neutral-500">Enter and confirm your new password below.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <FormField label="New Password" htmlFor="password" required>
              {(fieldProps) => <PasswordInput {...fieldProps} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </FormField>
            {password ? <PasswordStrengthMeter checks={checks} strength={strength} /> : null}
            <FormField label="Confirm Password" htmlFor="confirmPassword" required>
              {(fieldProps) => (
                <PasswordInput {...fieldProps} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              )}
            </FormField>

            <label className="flex items-start gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={signOutOthers}
                onChange={(e) => setSignOutOthers(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-700"
              />
              <span>
                Sign out all other devices
                <span className="block text-xs text-neutral-400">This will end all active sessions except this one.</span>
              </span>
            </label>

            {error ? <InlineError message={error} /> : null}
            <Button type="submit" loading={submitting} fullWidth size="lg">
              Reset password →
            </Button>
            <p className="text-center text-xs text-neutral-400">For security reasons, this reset link will expire in 20 minutes.</p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @shiftos/web build`
Expected: builds clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/auth/ResetPasswordPage.tsx
git commit -m "feat(auth): rebuild Reset Password on AuthShell"
```

---

## Task 9: Migration — `job_title` column + `get_pending_invitation()` RPC

**Files:**
- Create: `supabase/migrations/044_add_job_title_and_pending_invitation_lookup.sql`

**Interfaces:**
- Produces: `public.users.job_title` (nullable `text`), `public.get_pending_invitation()` — `SECURITY DEFINER`, no arguments, returns a table of at most one row: `(organization_name text, role_name text, branch_names text[], invited_by_name text, expires_at timestamptz, status text)`. `status` is `'pending' | 'accepted' | 'revoked' | 'expired'` (this function computes `'expired'` itself when a `pending` row's `expires_at <= now()`, unlike `accept_invitation()` which just fails for that case).

- [ ] **Step 1: Create `supabase/migrations/044_add_job_title_and_pending_invitation_lookup.sql`**

```sql
-- 044_add_job_title_and_pending_invitation_lookup.sql
-- Migration: Auth phase rebuild backend additions
-- Purpose: (1) Complete Profile's new optional Job Title field needs a
-- column that doesn't exist yet (phone/avatar_url already exist per 002/030).
-- (2) Accept Invitation's new invite-preview card (org, role, branch,
-- inviter, expiry) needs a read-only lookup — accept_invitation() (031/033)
-- only ever consumes an invitation, it never previews one, and it only
-- matches status='pending' AND expires_at > now(), so it can't tell the
-- frontend "this was already used" vs. "no such invitation" vs. "expired".

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title text;

COMMENT ON COLUMN public.users.job_title IS
  'Optional free-text role label shown on the schedule (e.g. "Floor Supervisor") — distinct from roles.name, which drives permissions. Set during Complete Profile, editable later from Settings.';

CREATE OR REPLACE FUNCTION public.get_pending_invitation()
RETURNS TABLE (
  organization_name text,
  role_name text,
  branch_names text[],
  invited_by_name text,
  expires_at timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_invitation record;
BEGIN
  SELECT email INTO v_user_email FROM public.users WHERE auth_user_id = auth.uid();
  IF v_user_email IS NULL THEN
    RETURN;
  END IF;

  SELECT
    i.id,
    i.status,
    i.expires_at,
    o.name AS org_name,
    r.name AS role_nm,
    u.first_name AS inviter_first,
    u.last_name AS inviter_last
  INTO v_invitation
  FROM public.invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  JOIN public.roles r ON r.id = i.role_id
  JOIN public.users u ON u.id = i.invited_by
  WHERE lower(i.email) = lower(v_user_email)
  ORDER BY i.created_at DESC
  LIMIT 1;

  IF v_invitation.id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v_invitation.org_name,
    v_invitation.role_nm,
    COALESCE(
      ARRAY(
        SELECT b.name
        FROM public.invitation_branch_access iba
        JOIN public.branches b ON b.id = iba.branch_id
        WHERE iba.invitation_id = v_invitation.id
      ),
      ARRAY[]::text[]
    ),
    v_invitation.inviter_first || ' ' || v_invitation.inviter_last,
    v_invitation.expires_at,
    CASE
      WHEN v_invitation.status = 'pending' AND v_invitation.expires_at <= now() THEN 'expired'
      ELSE v_invitation.status
    END;
END;
$$;

COMMENT ON FUNCTION public.get_pending_invitation() IS
  'Read-only preview of the current authenticated identity''s most recent invitation (matched by auth.email(), same pattern as accept_invitation() in 031/033) — returns organization/role/branch/inviter/expiry plus a computed status (pending/accepted/revoked/expired) so the Accept Invitation screen can render the right card and state before the invitee submits a password. Unlike accept_invitation(), never mutates public.invitations and does not filter out non-pending or expired rows — the frontend needs those to render "already accepted"/"expired" states.';

REVOKE ALL ON FUNCTION public.get_pending_invitation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pending_invitation() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pending_invitation() TO authenticated;
```

- [ ] **Step 2: Apply the migration against the linked Supabase project**

Run whatever this repo's existing migration-apply command is (check `package.json` scripts or `supabase/README.md` for the exact command already used for prior migrations — e.g. `supabase db push` if the Supabase CLI is linked). Apply only this new file; do not re-run earlier migrations.

- [ ] **Step 3: Verify against real data**

Using the Supabase SQL editor (or `psql` against the linked project), create a test invitation and confirm the function's behavior end-to-end:

```sql
-- Find a real organization/role/user to attribute the test invitation to,
-- then insert a pending invitation for a throwaway test email:
insert into public.invitations (organization_id, email, first_name, last_name, role_id, invited_by)
values ('<a real organization_id>', 'auth-phase-test@example.com', 'Test', 'Invitee', '<a real role_id>', '<a real users.id>');

-- Confirm the row and its expected columns exist:
select organization_id, email, status, expires_at from public.invitations where email = 'auth-phase-test@example.com';
```

Then, as an authenticated session whose `public.users.email` matches `auth-phase-test@example.com` (or temporarily via `SET request.jwt.claims` in the SQL editor to simulate `auth.uid()`), call:

```sql
select * from public.get_pending_invitation();
```

Expected: one row with the real organization name, role name, an empty or populated `branch_names` array, the inviter's full name, the invitation's `expires_at`, and `status = 'pending'`. Then manually set that row's `status` to `'accepted'` and re-run the same `select` — expected: the same row still comes back, now with `status = 'accepted'` (proving the "Used link" state is reachable). Clean up the test invitation row afterward (`delete from public.invitations where email = 'auth-phase-test@example.com';`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/044_add_job_title_and_pending_invitation_lookup.sql
git commit -m "feat(backend): add users.job_title and get_pending_invitation() RPC"
```

---

## Task 10: Rebuild Accept Invitation on `AuthShell` with invite preview

**Files:**
- Modify: `apps/web/src/pages/auth/AcceptInvitationPage.tsx` (full rewrite)

**Interfaces:**
- Consumes: `AuthShell` (Task 4), `AuthStatusPanel` (Task 3), `checklistFor`/`strengthFor` (Task 1), `PasswordStrengthMeter` (Task 1), `isNetworkError` (Task 2), `get_pending_invitation()` RPC (Task 9) via `supabase.rpc('get_pending_invitation')`.

- [ ] **Step 1: Rewrite `apps/web/src/pages/auth/AcceptInvitationPage.tsx`**

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Clock3, ShieldCheck, User, XCircle } from 'lucide-react';
import { Button, FormField, InlineError } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { checklistFor, strengthFor } from '../../lib/password.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthStatusPanel } from './AuthStatusPanel.js';
import { PasswordInput } from './PasswordInput.js';
import { PasswordStrengthMeter } from './PasswordStrengthMeter.js';

const HIGHLIGHT: AuthHighlight = {
  icon: User,
  title: 'Your access is already scoped',
  body: 'Role, branch and permissions were set by the person who invited you.'
};

interface PendingInvitation {
  organization_name: string;
  role_name: string;
  branch_names: string[];
  invited_by_name: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
}

type View = 'loading' | 'form' | 'expired' | 'used' | 'not-found' | 'success' | 'network-error';

/**
 * SHARED-005 — Accept Invitation / Account Setup (WF-002). The invite email
 * link (packages/auth's inviteUser) establishes a session the same way a
 * password-recovery link does; get_pending_invitation() (044) previews the
 * real invitation details before the person sets a password, and
 * accept_invitation() (031/033, called from SessionProvider's bootstrap once
 * the auth session updates after this form submits) turns it into real
 * organization membership + role + branch access — this page stays unaware
 * of that assignment logic, matching the separation already used for the
 * brand-new-org case (create_organization_with_owner).
 */
export default function AcceptInvitationPage(): React.ReactElement {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('loading');
  const [invitation, setInvitation] = useState<PendingInvitation | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_pending_invitation').maybeSingle<PendingInvitation>();
        if (cancelled) return;
        if (rpcError) {
          setView(isNetworkError(rpcError) ? 'network-error' : 'not-found');
          return;
        }
        if (!data) {
          setView('not-found');
          return;
        }
        setInvitation(data);
        setView(data.status === 'expired' ? 'expired' : data.status !== 'pending' ? 'used' : 'form');
      } catch (err) {
        if (!cancelled) setView(isNetworkError(err) ? 'network-error' : 'not-found');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const checks = useMemo(() => checklistFor(password), [password]);
  const strength = useMemo(() => strengthFor(checks), [checks]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (checks.some((c) => !c.passed)) {
      setError('Password does not meet all requirements yet.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('This invitation link has expired. Ask your administrator to resend it.');
        return;
      }
      setView('success');
    } catch (err) {
      if (isNetworkError(err)) setView('network-error');
      else setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const benefits: AuthBenefit[] = invitation
    ? [
        { icon: Building2, title: invitation.organization_name, body: invitation.branch_names.join(', ') || 'All branches' },
        { icon: ShieldCheck, title: `${invitation.role_name} role`, body: 'Access scoped by your organization.' },
        { icon: Clock3, title: 'Invitation valid 7 days', body: `Expires ${new Date(invitation.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.` },
        { icon: User, title: 'Invited by', body: `${invitation.invited_by_name}.` }
      ]
    : [];

  return (
    <AuthShell
      eyebrow="You've been invited"
      title="Join Your Team on"
      accent="ShiftOS"
      body="Your manager has invited you to a ShiftOS organization. Set a password to activate your account."
      highlight={HIGHLIGHT}
      benefits={benefits}
      topRightPrompt="Not your invitation?"
      topRightLinkLabel="Contact your manager"
    >
      {view === 'loading' ? (
        <div className="py-16 text-center text-sm text-neutral-400">Checking your invitation…</div>
      ) : view === 'network-error' ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="Couldn't reach ShiftOS"
          body="Check your internet connection and try again."
          ctaLabel="Try again"
          onCta={() => window.location.reload()}
        />
      ) : view === 'not-found' ? (
        <AuthStatusPanel
          icon={XCircle}
          tone="bad"
          title="No invitation found"
          body="We couldn't find a pending invitation for your account. Ask your administrator to send one."
          ctaLabel="Back to sign in"
          onCta={() => navigate('/sign-in')}
        />
      ) : view === 'expired' ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="This invitation has expired"
          body={`Invitations are valid for 7 days. Ask ${invitation?.invited_by_name ?? 'your manager'} to send a new one — your place on the team is unaffected.`}
          ctaLabel="Back to sign in"
          onCta={() => navigate('/sign-in')}
        />
      ) : view === 'used' ? (
        <AuthStatusPanel
          icon={XCircle}
          tone="bad"
          title="This invitation was already accepted"
          body="An account already exists for this email. Sign in instead, or reset your password if you've forgotten it."
          ctaLabel="Go to sign in"
          onCta={() => navigate('/sign-in')}
          secondaryLabel="Reset password"
          onSecondary={() => navigate('/forgot-password')}
        />
      ) : view === 'success' ? (
        <AuthStatusPanel
          icon={CheckCircle2}
          tone="ok"
          title="Welcome to ShiftOS"
          body="Your account is active. Next, complete your profile so your team can recognize you."
          ctaLabel="Complete profile →"
          onCta={() => navigate('/complete-profile')}
        />
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Accept your invitation</h2>
          <p className="mt-1 text-sm text-neutral-500">Set a password to activate your ShiftOS account.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <FormField label="Create Password" htmlFor="password" required>
              {(fieldProps) => <PasswordInput {...fieldProps} autoComplete="new-password" placeholder="Create your password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </FormField>
            {password ? <PasswordStrengthMeter checks={checks} strength={strength} /> : null}
            <FormField label="Confirm Password" htmlFor="confirmPassword" required>
              {(fieldProps) => (
                <PasswordInput {...fieldProps} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              )}
            </FormField>
            {error ? <InlineError message={error} /> : null}
            <Button type="submit" loading={submitting} fullWidth size="lg">
              Accept invitation →
            </Button>
            <p className="text-center text-xs text-neutral-400">By accepting you agree to our Terms &amp; Conditions and Privacy Policy.</p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @shiftos/web build`
Expected: builds clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/auth/AcceptInvitationPage.tsx
git commit -m "feat(auth): rebuild Accept Invitation with invite preview"
```

---

## Task 11: Rebuild Verify Email with OTP code entry + resend

**Files:**
- Modify: `apps/web/src/pages/auth/VerifyEmailPage.tsx` (full rewrite)
- Modify: `apps/web/src/pages/auth/SignUpPage.tsx:1,60-70` (stash the email for the OTP screen and navigate to it instead of rendering the inline "check your email" card)

**Interfaces:**
- Consumes: `AuthShell` (Task 4), `AuthStatusPanel` (Task 3), `isNetworkError` (Task 2), `supabase.auth.verifyOtp`/`supabase.auth.resend` (existing SDK methods, no wrapper needed).
- Produces: `sessionStorage['shiftos.pendingVerifyEmail']` (a plain email string) — read by `VerifyEmailPage`, written by `SignUpPage`.

- [ ] **Step 1: Update `SignUpPage.tsx` to hand off to Verify Email instead of showing an inline card**

In `apps/web/src/pages/auth/SignUpPage.tsx`, add the import:

```tsx
import { useNavigate } from 'react-router-dom';
```

Add `const navigate = useNavigate();` inside the component (alongside the existing `useState` calls), remove the `checkEmail` state and its `setCheckEmail(true)` call, and replace that branch with a stash + navigate:

```tsx
      if (!data.session) {
        window.sessionStorage.setItem('shiftos.pendingVerifyEmail', email);
        navigate('/verify-email');
        return;
      }
```

Remove the now-unused `checkEmail`/`setCheckEmail` state declaration and the `{checkEmail ? (...) : (...)}` conditional wrapper around the form — the form's JSX becomes the component's only return branch (still inside `<AuthShell>`).

- [ ] **Step 2: Rewrite `apps/web/src/pages/auth/VerifyEmailPage.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Clock3, Mail, ShieldCheck, Users } from 'lucide-react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';
import { AuthStatusPanel } from './AuthStatusPanel.js';

const BENEFITS: AuthBenefit[] = [
  { icon: ShieldCheck, title: "Confirms it's you", body: 'Protects the organization you create.' },
  { icon: Clock3, title: 'Valid for 24 hours', body: 'Request a new link any time.' },
  { icon: Building2, title: 'Unlocks setup', body: 'Onboarding starts once verified.' },
  { icon: Users, title: 'Enables invitations', body: 'Needed before inviting your team.' }
];

const PENDING_EMAIL_KEY = 'shiftos.pendingVerifyEmail';

/** SHARED-004 — Email Verification (WF-001 decision point: unverified email is blocked, not a generic error, DEC-019). */
export default function VerifyEmailPage(): React.ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [view, setView] = useState<'checking' | 'no-email' | 'form' | 'success' | 'network-error'>('checking');

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setView('success');
        return;
      }
      const pending = window.sessionStorage.getItem(PENDING_EMAIL_KEY);
      if (!pending) {
        setView('no-email');
        return;
      }
      setEmail(pending);
      setView('form');
    });
  }, []);

  const handleVerify = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!email) return;
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' });
      if (verifyError) {
        setError("That code isn't right. Check the most recent email — earlier codes stop working once a new one is sent.");
        return;
      }
      window.sessionStorage.removeItem(PENDING_EMAIL_KEY);
      setView('success');
    } catch (err) {
      if (isNetworkError(err)) setView('network-error');
      else setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (!email) return;
    setResending(true);
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
      if (resendError) {
        setError('Could not resend the code. Please try again in a moment.');
      } else {
        setResent(true);
      }
    } catch (err) {
      if (isNetworkError(err)) setView('network-error');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="One step left"
      title="Verify Your"
      accent="Email"
      body="Confirm your email address so we can secure your account and finish creating your organization workspace."
      highlight={email ? { icon: Mail, title: `Sent to ${email}`, body: 'Wrong address? Change it before verifying.' } : undefined}
      benefits={BENEFITS}
      topRightPrompt="Wrong email address?"
      topRightLinkLabel="Change it"
      topRightLinkTo="/sign-up"
    >
      {view === 'checking' ? (
        <div className="py-16 text-center text-sm text-neutral-400">Checking your session…</div>
      ) : view === 'network-error' ? (
        <AuthStatusPanel
          icon={Clock3}
          tone="warn"
          title="Couldn't reach ShiftOS"
          body="Check your internet connection and try again."
          ctaLabel="Try again"
          onCta={() => setView('form')}
        />
      ) : view === 'no-email' ? (
        <AuthStatusPanel
          icon={Mail}
          tone="info"
          title="Nothing to verify yet"
          body="Start by creating your account — we'll send a verification code to your email."
          ctaLabel="Go to sign up"
          onCta={() => navigate('/sign-up')}
        />
      ) : view === 'success' ? (
        <AuthStatusPanel
          icon={CheckCircle2}
          tone="ok"
          title="Email verified"
          body="Your account is confirmed. Next, set up your organization."
          ctaLabel="Start setup →"
          onCta={() => navigate('/sign-in')}
        />
      ) : (
        <>
          <h2 className="text-2xl font-bold text-neutral-900">Verify your email</h2>
          <p className="mt-1 text-sm text-neutral-500">Enter the 6-digit code from the email we sent to {email}.</p>

          <form onSubmit={handleVerify} noValidate className="mt-6 flex flex-col gap-4">
            <FormField label="Verification Code" htmlFor="code" required hint="6 digits">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              )}
            </FormField>
            {error ? <InlineError message={error} /> : null}
            <Button type="submit" loading={submitting} fullWidth size="lg">
              Verify email →
            </Button>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resending}
              className="text-center text-sm font-medium text-brand-600 hover:text-brand-700 disabled:text-neutral-400"
            >
              {resending ? 'Resending…' : resent ? 'Code resent — check your email' : 'Resend code'}
            </button>
            <p className="text-center text-xs text-neutral-400">Codes and links expire after 24 hours for your security.</p>
          </form>
        </>
      )}
    </AuthShell>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter @shiftos/web build`
Expected: builds clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/auth/SignUpPage.tsx apps/web/src/pages/auth/VerifyEmailPage.tsx
git commit -m "feat(auth): rebuild Verify Email with OTP code entry and resend"
```

---

## Task 12: Rebuild Complete Profile with Job Title + photo upload

**Files:**
- Modify: `apps/web/src/auth/types.ts:1-10` (add `job_title` to `UserProfile`)
- Modify: `apps/web/src/auth/SessionProvider.tsx:22,60-62,150-169` (extend `completeProfile`'s input type and the `users` select/insert to include `jobTitle`/`avatarUrl`)
- Modify: `apps/web/src/pages/auth/CompleteProfilePage.tsx` (full rewrite: add Job Title field + photo upload, switch to `AuthShell`)

**Interfaces:**
- Consumes: `AuthShell` (Task 4), existing `avatars` storage bucket + `users/{authUserId}/...` RLS policy (migration 030, already live — no backend change).
- Produces (modified): `completeProfile(input: { firstName: string; lastName: string; phone?: string; jobTitle?: string; avatarUrl?: string }): Promise<{ error: string | null }>`; `UserProfile` gains `job_title: string | null`.

- [ ] **Step 1: Add `job_title` to `UserProfile` in `apps/web/src/auth/types.ts`**

```ts
export interface UserProfile {
  id: string;
  auth_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  avatar_url: string | null;
  is_active: boolean;
}
```

- [ ] **Step 2: Extend `SessionProvider.tsx`**

Update the `completeProfile` type in the `SessionContextValue` interface (line 22):

```ts
  completeProfile: (input: { firstName: string; lastName: string; phone?: string; jobTitle?: string; avatarUrl?: string }) => Promise<{ error: string | null }>;
```

Update the `.select(...)` call inside `bootstrap` (line 62) to include the new column:

```ts
      .select('id, auth_user_id, first_name, last_name, email, phone, job_title, avatar_url, is_active')
```

Update `completeProfile`'s implementation (lines 150-169):

```ts
  const completeProfile = useCallback(
    async (input: {
      firstName: string;
      lastName: string;
      phone?: string;
      jobTitle?: string;
      avatarUrl?: string;
    }): Promise<{ error: string | null }> => {
      if (!state.authUser) {
        return { error: 'Your session has expired. Please sign in again.' };
      }
      const { error } = await supabase.from('users').insert({
        auth_user_id: state.authUser.id,
        first_name: input.firstName,
        last_name: input.lastName,
        email: state.authUser.email,
        phone: input.phone ?? null,
        job_title: input.jobTitle ?? null,
        avatar_url: input.avatarUrl ?? null
      });
      if (error) {
        return { error: error.message };
      }
      await bootstrap();
      return { error: null };
    },
    [state.authUser, bootstrap]
  );
```

- [ ] **Step 3: Rewrite `apps/web/src/pages/auth/CompleteProfilePage.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Shield, User, Users } from 'lucide-react';
import { Button, FormField, InlineError, Input } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { supabase } from '../../lib/supabase.js';
import { isNetworkError } from '../../lib/authErrors.js';
import { AuthShell, type AuthBenefit, type AuthHighlight } from './AuthShell.js';

const HIGHLIGHT: AuthHighlight = {
  icon: User,
  title: 'Photos are optional',
  body: 'Without one, ShiftOS shows your initials in every avatar.'
};

const BENEFITS: AuthBenefit[] = [
  { icon: Users, title: 'Recognizable on shift', body: 'Your name appears on schedules and tasks.' },
  { icon: MessageSquare, title: 'Reachable', body: 'Supervisors can contact you about cover.' },
  { icon: User, title: 'Photo optional', body: 'Add, replace or remove it any time.' },
  { icon: Shield, title: 'Only your organization', body: 'Profile details stay inside it.' }
];

const PENDING_NAME_KEY = 'shiftos.pendingName';

/**
 * Not a numbered screen in FD-4 on its own — it's the concrete UI for the
 * `public.users` self-insert step every authenticated identity needs before
 * create_organization_with_owner or any RPC operation can run (see
 * SessionProvider.completeProfile / migration 017's user_self_manage RLS
 * policy). Session status 'no-profile' renders this unconditionally.
 */
export default function CompleteProfilePage(): React.ReactElement {
  const { authUser, completeProfile, signOut } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // SignUpPage stashes the name the person typed there so they don't have
  // to retype it here — best-effort only, cleared immediately after use.
  useEffect(() => {
    const pending = window.sessionStorage.getItem(PENDING_NAME_KEY);
    if (!pending) return;
    window.sessionStorage.removeItem(PENDING_NAME_KEY);
    try {
      const parsed = JSON.parse(pending) as { firstName?: string; lastName?: string; phone?: string };
      if (parsed.firstName) setFirstName(parsed.firstName);
      if (parsed.lastName) setLastName(parsed.lastName);
      if (parsed.phone) setPhone(parsed.phone);
    } catch {
      // Malformed sessionStorage value — ignore, the form just starts blank.
    }
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('First name, last name and phone number are needed.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let avatarUrl: string | undefined;
      if (photoFile && authUser) {
        const path = `users/${authUser.id}/${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, photoFile, { upsert: true });
        if (uploadError) {
          setError('Could not upload your photo. You can add it later from Settings.');
        } else {
          avatarUrl = path;
        }
      }
      const { error: submitError } = await completeProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim() || undefined,
        avatarUrl
      });
      if (submitError) setError(submitError);
    } catch (err) {
      setError(isNetworkError(err) ? "Couldn't reach ShiftOS. Check your connection and try again." : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Almost there"
      title="Complete Your"
      accent="Profile"
      body="Add the details your branch needs to recognize you on the schedule. A photo is optional and can be added later."
      highlight={HIGHLIGHT}
      benefits={BENEFITS}
      topRightPrompt="Signed in as"
      topRightLinkLabel={authUser?.email ?? ''}
    >
      <h2 className="text-2xl font-bold text-neutral-900">Complete your profile</h2>
      <p className="mt-1 text-sm text-neutral-500">This is how your team will see you in ShiftOS.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-50 text-neutral-400 hover:border-brand-400"
          >
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={26} />
            )}
          </button>
          <div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              {photoFile ? 'Change photo' : 'Add photo'}
            </button>
            <p className="text-xs text-neutral-400">Optional. JPG or PNG.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <FormField label="First Name" htmlFor="firstName" required>
          {(fieldProps) => <Input {...fieldProps} placeholder="Sarah" value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
        </FormField>
        <FormField label="Last Name" htmlFor="lastName" required>
          {(fieldProps) => <Input {...fieldProps} placeholder="Johnson" value={lastName} onChange={(e) => setLastName(e.target.value)} />}
        </FormField>
        <FormField label="Phone Number" htmlFor="phone" required>
          {(fieldProps) => <Input {...fieldProps} type="tel" autoComplete="tel" placeholder="+234 802 345 6789" value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </FormField>
        <FormField label="Job Title" htmlFor="jobTitle" hint="Optional">
          {(fieldProps) => <Input {...fieldProps} placeholder="Floor Supervisor" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />}
        </FormField>

        {error ? <InlineError message={error} /> : null}
        <Button type="submit" loading={submitting} fullWidth size="lg">
          Save and continue →
        </Button>
        <p className="text-center text-xs text-neutral-400">You can change any of this later from Settings → Profile.</p>
        <button type="button" onClick={() => void signOut()} className="text-center text-sm font-medium text-neutral-500 hover:text-neutral-700">
          Sign out
        </button>
      </form>
    </AuthShell>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm --filter @shiftos/web build`
Expected: builds clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/auth/types.ts apps/web/src/auth/SessionProvider.tsx apps/web/src/pages/auth/CompleteProfilePage.tsx
git commit -m "feat(auth): add Job Title and photo upload to Complete Profile"
```

---

## Task 13: Remove the superseded `AuthMarketingLayout`, final verification

**Files:**
- Delete: `apps/web/src/pages/auth/AuthMarketingLayout.tsx`

**Interfaces:** None — this is cleanup once Tasks 5-8 have moved every consumer off this file.

- [ ] **Step 1: Confirm no remaining consumers**

Run: `grep -rn "AuthMarketingLayout" apps/web/src` (or use the Grep tool)
Expected: only `apps/web/src/pages/auth/AuthMarketingLayout.tsx` itself matches (its own definition) — Sign In, Sign Up, Forgot Password, and Reset Password should all now import `AuthShell` instead.

- [ ] **Step 2: Delete the file**

```bash
git rm apps/web/src/pages/auth/AuthMarketingLayout.tsx
```

- [ ] **Step 3: Full verification build**

Run: `pnpm --filter @shiftos/ui build && pnpm --filter @shiftos/web build`
Expected: both build clean with no errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(auth): remove superseded AuthMarketingLayout"
```

- [ ] **Step 5: Manual verification against the dev server**

Start the dev server (`pnpm --filter @shiftos/web dev`) and visit each of the 7 rebuilt routes (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/accept-invitation`, and reach Complete Profile by signing up a throwaway account) to confirm the dark brand panel, benefits list, and form card render as expected at both desktop and mobile widths, and that the real Supabase calls (sign up, sign in, password reset) still work end-to-end. Report back anything that looks wrong before considering the phase done — this step needs a human looking at the browser, not just a clean build.
