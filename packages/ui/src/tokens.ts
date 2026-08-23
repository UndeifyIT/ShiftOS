/**
 * ShiftOS design tokens — the single canonical source for color, typography,
 * spacing, radius and shadow values (UI-001 §14).
 *
 * Sourced from the `design_handoff_shiftos/` handoff (README "Design Tokens"
 * section) — supersedes the prior "Graphite Editorial" teal/serif system in
 * full, app-wide (Marketing, Auth, Onboarding, Dashboards, Admin all inherit
 * this). One font family throughout (no separate display serif); `display`
 * is kept as an alias of `sans` so existing `font-display` usages don't need
 * touching.
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
  /** Warm orange — the one brand accent. Carries the logo, primary actions, links, active nav. */
  brand: {
    50: '#FDF0E9', // soft
    100: '#FBE0D2',
    200: '#F7C2A6',
    300: '#F2A47A',
    400: '#F17A48',
    500: '#F04E17', // primary
    600: '#D8480E',
    700: '#C6420E', // deep
    800: '#A3350B',
    900: '#7A2808',
    soft: '#FDF0E9',
    deep: '#C6420E'
  },
  /** Warm ink/graphite scale (ink/body/mute/faint/line from the handoff, with interpolated steps). */
  neutral: {
    0: '#ffffff',
    50: '#FBFAF9', // base background
    100: '#F5F3F1',
    200: '#EBE7E3', // line
    300: '#DDD6D0',
    400: '#A79C93', // faint
    500: '#857A72', // mute
    600: '#6B615A',
    700: '#57504A', // body
    800: '#453F3A',
    900: '#38312B' // ink — primary text
  },
  success: { 50: '#E9F7EF', soft: '#E9F7EF', 500: '#2E9E62', 600: '#268552', text: '#1D6B41' },
  warning: { 50: '#FDF4E6', soft: '#FDF4E6', 500: '#B77714', 600: '#9C6410', text: '#7A4F0C' },
  error: { 50: '#FCEDEA', soft: '#FCEDEA', 500: '#C93A22', 600: '#A92F1B', text: '#7A2314' },
  info: { 50: '#EFF4FE', soft: '#EFF4FE', 500: '#2563EB', 600: '#1D4FC0', text: '#1E3A8A' }
} as const;

export const typography = {
  /** All UI, marketing and onboarding — one font family throughout. */
  fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  /** Alias of `fontFamily` — kept as a separate token only so existing `font-display` usages resolve unchanged. */
  displayFontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  scale: {
    pageTitle: { size: '1.75rem', lineHeight: '2.25rem', weight: 700 },
    sectionHeading: { size: '1.25rem', lineHeight: '1.75rem', weight: 600 },
    subheading: { size: '1.0625rem', lineHeight: '1.5rem', weight: 600 },
    body: { size: '0.9375rem', lineHeight: '1.5rem', weight: 400 },
    supporting: { size: '0.8125rem', lineHeight: '1.25rem', weight: 400 }
  },
  /** Display scale — marketing/onboarding surfaces only. */
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

export const radius = {
  sm: '9px',
  md: '12px',
  lg: '16px',
  xl: '22px',
  pill: '999px'
} as const;

/** Soft, large-radius, low-opacity — ink-toned per the handoff (rgba(56,49,43,...) = #38312B). */
export const shadow = {
  sm: '0 1px 2px rgba(56, 49, 43, 0.08)',
  md: '0 8px 20px -8px rgba(56, 49, 43, 0.18)',
  lg: '0 24px 60px -34px rgba(56, 49, 43, 0.4)'
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
