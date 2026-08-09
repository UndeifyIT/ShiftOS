/**
 * Mirrors packages/ui/src/tokens.ts's palette/spacing/radius values.
 * apps/mobile doesn't depend on @shiftos/ui at runtime (that package's
 * components are DOM/Tailwind-only and the workspace package isn't wired
 * into Metro's resolver for this app) — these are the same values,
 * expressed as plain RN-safe constants. Keep in sync by hand if the
 * canonical tokens change (same pattern as apps/web/tailwind.config.cjs).
 */
export const color = {
  brand500: '#f4551c',
  brand600: '#e13d0f',
  brand50: '#fff4ed',
  brand100: '#ffe6d5',
  neutral0: '#ffffff',
  neutral50: '#fdf8f5',
  neutral100: '#f7efe9',
  neutral200: '#ece1d9',
  neutral300: '#dccdc0',
  neutral500: '#8a7a6b',
  neutral600: '#645749',
  neutral900: '#1a1714',
  success500: '#1fa864',
  successText: '#0f6b3f',
  successBg: '#eefcf3',
  warning500: '#d69a1f',
  warningText: '#7a5a10',
  warningBg: '#fff8e8',
  error500: '#d43d2c',
  errorText: '#8f2517',
  errorBg: '#fdeeec'
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 14, xl: 18 } as const;
