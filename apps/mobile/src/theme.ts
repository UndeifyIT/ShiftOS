/**
 * Mirrors packages/ui/src/tokens.ts's palette/spacing/radius values.
 * apps/mobile doesn't depend on @shiftos/ui at runtime (that package's
 * components are DOM/Tailwind-only and the workspace package isn't wired
 * into Metro's resolver for this app) — these are the same values,
 * expressed as plain RN-safe constants. Keep in sync by hand if the
 * canonical tokens change (same pattern as apps/web/tailwind.config.cjs).
 */
export const color = {
  brand500: '#F04E17',
  brand600: '#C6420E',
  brand50: '#FDF0E9',
  brand100: '#FBE0D2',
  neutral0: '#ffffff',
  neutral50: '#FBFAF9',
  neutral100: '#F5F3F1',
  neutral200: '#EBE7E3',
  neutral300: '#DDD6D0',
  neutral500: '#857A72',
  neutral600: '#57504A',
  neutral900: '#38312B',
  success500: '#2E9E62',
  successText: '#1D6B41',
  successBg: '#E9F7EF',
  warning500: '#B77714',
  warningText: '#7A4F0C',
  warningBg: '#FDF4E6',
  error500: '#C93A22',
  errorText: '#7A2314',
  errorBg: '#FCEDEA'
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 9, md: 12, lg: 16, xl: 22 } as const;
