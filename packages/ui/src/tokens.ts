/**
 * ShiftOS design tokens — the single canonical source for color, typography,
 * spacing, radius and shadow values (UI-001 §14). Extracted from the approved
 * ShiftOS marketing/product reference imagery: warm orange brand identity on
 * a light, warm-neutral surface system.
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
  brand: {
    50: '#fff4ed',
    100: '#ffe6d5',
    200: '#ffc9a8',
    300: '#ffa670',
    400: '#ff7a38',
    500: '#f4551c', // primary brand orange
    600: '#e13d0f',
    700: '#ba2c0d',
    800: '#942512',
    900: '#782112'
  },
  neutral: {
    0: '#ffffff',
    50: '#fdf8f5', // page background (warm off-white)
    100: '#f7efe9',
    200: '#ece1d9',
    300: '#dccdc0',
    400: '#b6a696',
    500: '#8a7a6b',
    600: '#645749',
    700: '#453b31',
    800: '#2b2620',
    900: '#1a1714' // primary text
  },
  success: { 50: '#eefcf3', 500: '#1fa864', 600: '#178a51', text: '#0f6b3f' },
  warning: { 50: '#fff8e8', 500: '#d69a1f', 600: '#b17f16', text: '#7a5a10' },
  error: { 50: '#fdeeec', 500: '#d43d2c', 600: '#b32e1f', text: '#8f2517' },
  info: { 50: '#eef4fd', 500: '#2f6fd6', 600: '#255cb3', text: '#1d4788' }
} as const;

export const typography = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
  scale: {
    pageTitle: { size: '1.75rem', lineHeight: '2.25rem', weight: 700 },
    sectionHeading: { size: '1.25rem', lineHeight: '1.75rem', weight: 600 },
    subheading: { size: '1.0625rem', lineHeight: '1.5rem', weight: 600 },
    body: { size: '0.9375rem', lineHeight: '1.5rem', weight: 400 },
    supporting: { size: '0.8125rem', lineHeight: '1.25rem', weight: 400 }
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
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '18px',
  pill: '999px'
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(26, 23, 20, 0.06)',
  md: '0 4px 12px rgba(26, 23, 20, 0.08)',
  lg: '0 12px 32px rgba(26, 23, 20, 0.12)'
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
