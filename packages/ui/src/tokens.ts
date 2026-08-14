/**
 * ShiftOS design tokens — the single canonical source for color, typography,
 * spacing, radius and shadow values (UI-001 §14).
 *
 * "Graphite Editorial" system (2026-08-14 visual/UX reset): graphite
 * neutrals, deep teal brand accent, Newsreader display serif for
 * marketing/onboarding headlines paired with Inter for all application UI.
 * Replaces the prior warm-orange system in full — see
 * docs/superpowers/specs/2026-08-14-graphite-editorial-design-system.md.
 *
 * `apps/web/tailwind.config.cjs` mirrors the `color`/`radius` values below
 * (Tailwind cannot `import` a TS module into a CJS config without an extra
 * build step) — keep the two in sync when either changes, the same pattern
 * already used for DATABASE_TABLES in packages/constants.
 *
 * `apps/mobile` StyleSheets should import this module directly (plain TS,
 * no DOM/CSS dependency) rather than duplicating values.
 */

export const color = {
  /** Deep teal — the one brand accent. Carries the logo, primary actions, links, active nav. */
  brand: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6', // primary — "Deep Teal"
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    soft: '#ccfbf1',
    deep: '#0f766e'
  },
  /** Graphite neutral scale — replaces the prior warm-beige scale. */
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#111111' // graphite base — primary text, sidebar surface
  },
  /** Kept distinct from brand teal so status states stay legible against it. */
  success: { 50: '#ecfdf5', soft: '#d1fae5', 500: '#10b981', 600: '#059669', text: '#065f46' },
  warning: { 50: '#fffbeb', soft: '#fef3c7', 500: '#f59e0b', 600: '#d97706', text: '#92400e' },
  error: { 50: '#fef2f2', soft: '#fee2e2', 500: '#ef4444', 600: '#dc2626', text: '#991b1b' },
  info: { 50: '#eff6ff', soft: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', text: '#1e40af' }
} as const;

export const typography = {
  /** All application UI — dashboards, tables, forms. Never the display font at dense sizes. */
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  /** Marketing headlines + onboarding step titles only — never dashboards/tables. */
  displayFontFamily: 'Newsreader, Georgia, "Times New Roman", serif',
  scale: {
    pageTitle: { size: '1.75rem', lineHeight: '2.25rem', weight: 700 },
    sectionHeading: { size: '1.25rem', lineHeight: '1.75rem', weight: 600 },
    subheading: { size: '1.0625rem', lineHeight: '1.5rem', weight: 600 },
    body: { size: '0.9375rem', lineHeight: '1.5rem', weight: 400 },
    supporting: { size: '0.8125rem', lineHeight: '1.25rem', weight: 400 }
  },
  /** Display scale — Newsreader, marketing/onboarding surfaces only. */
  display: {
    hero: { size: '3rem', lineHeight: '1.1', weight: 600 },
    section: { size: '2rem', lineHeight: '1.15', weight: 600 },
    stepTitle: { size: '1.5rem', lineHeight: '1.2', weight: 600 }
  }
} as const;

export const space = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px'
} as const;

/** Tighter, more editorial than the prior soft-rounded scale. */
export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  pill: '999px'
} as const;

/** Subtler than the prior warm-toned shadows — restrained, not decorative. */
export const shadow = {
  sm: '0 1px 2px rgba(17, 17, 17, 0.06)',
  md: '0 2px 8px rgba(17, 17, 17, 0.08)',
  lg: '0 8px 24px rgba(17, 17, 17, 0.10)'
} as const;

export const breakpoint = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280
} as const;

export const zIndex = {
  dropdown: 20,
  sticky: 30,
  overlay: 40,
  modal: 50,
  toast: 60
} as const;

export const transition = {
  fast: '120ms ease',
  base: '180ms ease',
  slow: '260ms ease'
} as const;
