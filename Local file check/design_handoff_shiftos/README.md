# Handoff: ShiftOS — Admin, Dashboards, Auth, Onboarding, Marketing

## Overview
ShiftOS is a shift-scheduling SaaS for retail/service teams (managers, supervisors, staff, org admins). This bundle covers the full product surface designed so far: marketing site, auth flows, org onboarding wizard, the role-based dashboards (Manager/Supervisor/Staff, with mobile-responsive layouts), and a standalone Admin console (org-wide subscription/branch oversight).

## About the Design Files
The HTML files in this bundle are **design references**, built as interactive prototypes to show intended look, content, and behavior — they are not production code to copy directly. The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, native, etc.) using its established component patterns, state management, and data layer. If no frontend environment exists yet, pick the framework best suited to the target stack and implement there.

Each file is self-contained and exposes a small set of preview props (visible in a "Tweaks" panel) that switch between screens/states — these map directly to the props/route state your real implementation should support (see per-file breakdown below).

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and per-state layouts (loading/empty/populated, validation/success/error) are final-intent. Recreate pixel-close using the values in Design Tokens below, adapted to your codebase's existing design system where one already exists (don't introduce a second token set — reconcile with the app's current tokens if colors are close).

## Files
- `ShiftOS Marketing.dc.html` — public marketing site (8 pages)
- `ShiftOS Auth.dc.html` — sign in/up, password reset, email verification, invitations, complete-profile (8 screens × 7 states each)
- `ShiftOS Onboarding.dc.html` — 5-step org setup wizard (Organization → Branch → Supervisor → Department → Finish), with "Shifty" guide character
- `ShiftOS Dashboards.dc.html` — Manager / Supervisor / Staff role dashboards, responsive (desktop sidebar nav, mobile bottom tab bar + "More" sheet)
- `ShiftOS Admin.dc.html` — standalone org Admin console (Overview, Branches, Branch Detail, Subscription, Settings), with Desktop/Mobile preview states

## Screens / Views

### Marketing (`ShiftOS Marketing.dc.html`)
Prop `page`: Home, Features, Solutions, Pricing, Resources, About, Demo, Legal.
- Sticky translucent header (blur backdrop), max-width 1180px content column, generous flex-wrap sections.
- Home: hero with headline + CTA + live "schedule" mock card, industry chips, role cards (manager/supervisor/staff), supervisor "laptop" visual, staff "phone" mock.
- Each page is a fully separate content tree (not tabs over shared layout) — recreate as real routes.

### Auth (`ShiftOS Auth.dc.html`)
Props: `screen` (Sign In, Sign Up, Forgot Password, Reset Password, Verify Email, Accept Invitation, Admin Invitation, Complete Profile), `viewState` (Idle, Validation error, Loading, Success, Network error, Expired link, Used link).
- Split layout: dark left brand panel (benefits list, org highlight card) + right form panel (max-width 462px card).
- Below ~720px: brand panel hides, form goes full width (mobile breakpoint already implemented — see `@media (max-width: 720px)` in the file's `<style>`).
- Every screen supports the full state matrix (idle/loading/validation/success/expired/used) — recreate as real async states, not just visual toggles.
- Password strength meter (4 rules: length, uppercase, lowercase, number) on Sign Up / Reset / Accept Invitation.

### Onboarding (`ShiftOS Onboarding.dc.html`)
Prop `step`: Organization, Branch, Supervisor, Department, Finish.
- Left sidebar: step list + progress bar (desktop only — hides below ~760px, see `@media` block).
- Center: form card per step, with per-step validation/save-failed banners.
- Right: "Shifty" guidance panel (contextual tips + pointer badge on the active field) + step illustration — hides on mobile to prioritize the form.
- Department step: add-from-suggestions chips + editable department list. Supervisor step: permission toggle grid + repeat/invite controls.
- Finish step: completion summary + "next steps" cards.

### Dashboards (`ShiftOS Dashboards.dc.html`)
Props: `role` (Manager, Supervisor, Staff), `page` (per-role nav sections), `viewState` (Populated/Loading/Empty), `showShifty`.
- Desktop: left sidebar nav (role-specific sections) + header + content.
- Mobile (<~860px, `isMobile` computed state): sidebar hides, bottom tab bar shows the role's primary sections (Staff's 5 sections fit directly — full functionality on mobile); any overflow sections go under a "More" sheet.
- Manager/Supervisor Schedules grid becomes **view-only on mobile** with an "Open on desktop to edit" banner — all edit affordances (drag, add shift, row menus) gated behind a `canEdit` flag.
- Sections per role: Manager (Overview, Schedules, Employees, Supervisors, Admins, Tasks, Recent Activity, Announcements, Requests, Reports, Settings); Supervisor (Today's Shift, Schedules, Team, Attendance, Tasks, Recent Activity, Requests, Shift Notes, Announcements, Settings); Staff (My Shift, My Schedule, My Requests, Announcements, Profile).
- Settings is a tabbed in-page view (`kind: "settingsV2"`) for Manager/Supervisor — not a separate route.
- Table/card/schedule/tasks/announcements/requests/reports section "kinds" are reusable renderers driven by a per-page config object — recreate as typed section/row components, not one-off markup per page.
- Note: this file previously had a duplicate "Admin" role — that was removed. The standalone Admin experience lives only in `ShiftOS Admin.dc.html`; don't reintroduce an Admin role here.

### Admin (`ShiftOS Admin.dc.html`)
Props: `screen` (Overview, Branches, Branch Detail, Subscription, Settings), `device` (Desktop, Mobile), `data` (Populated, Loading, Empty).
- Org-level console: branch health list, subscription usage/seats card, org-wide settings tabs.
- Explicit Desktop/Mobile preview prop — check both device layouts when recreating.
- Admins can view branches/subscription/settings but cannot manage schedules or employees (day-to-day ops stay with Manager/Supervisor).

## Interactions & Behavior
- All forms use inline validation banners (red, with a specific title/body per error case) rather than per-field-only errors.
- Buttons show a "busy" label + disabled state during submit (simulated via timeout in the prototype — replace with real async calls).
- Toasts (`this.toast(...)`) confirm non-navigating actions (message sent, note saved, etc.) — recreate with your app's toast/snackbar system.
- Modals are opened via a `ctaModal` lookup keyed by button label (e.g. "New shift" → `newShift` modal) — recreate as a modal-id dispatch rather than one component per trigger.
- Reduced-motion is respected everywhere (`@media (prefers-reduced-motion: reduce)`) — keep this in the real implementation.

## Design Tokens
Font: **Plus Jakarta Sans** (weights 400/500/600/700/800), loaded from Google Fonts; fallback `ui-sans-serif, system-ui, sans-serif`.

Colors:
- ink (primary text): #38312B
- body (secondary text): #57504A
- mute: #857A72
- faint: #A79C93
- line (borders): #EBE7E3
- primary (brand/CTA): #F04E17
- deep (brand, darker/hover): #C6420E
- soft (brand tint bg): #FDF0E9
- ok: #2E9E62 / okSoft: #E9F7EF
- warn: #B77714 / warnSoft: #FDF4E6
- bad: #C93A22 / badSoft: #FCEDEA
- info: #2563EB / infoSoft: #EFF4FE
- Base backgrounds: #FBFAF9 (auth/dashboards), #fff (onboarding/marketing/cards)

Radii: 9–24px depending on component size (buttons/inputs ~11–14px, cards 14–24px, pills 999px).
Shadows: soft, large-radius, low-opacity (e.g. `0 24px 60px -34px rgba(56,49,43,.4)` on primary cards).
Spacing: mostly 8/10/12/14/16/18/22/24px steps; page content max-width 1080–1180px.

## Assets
Located in `assets/`: `logo-shiftos.png`, `logo-shiftos-light.png`, `logo-mark.png` (brand marks), `illus-building.png`, `illus-store.png`, `illus-team.png`, `illus-brand.png`, `illus-about-hero.png` (3D-style illustrations, transparent background), `shifty-wave.png`, `shifty-guide.png`, `shifty-success.png`, `shifty-avatar.png` (the onboarding guide character, per-pose), `dashboard-mock.png`, `hero-sculpture.png`, `phone-mock.png` (marketing hero visuals). All are illustration/branding assets — carry them over as-is or request refreshed exports from design if resolution is insufficient for target screens.
