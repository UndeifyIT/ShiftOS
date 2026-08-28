/**
 * Mirrors packages/ui/src/tokens.ts — Tailwind's CJS config can't import that
 * ESM TS module directly, so these values are kept in sync by hand. Update
 * both together.
 */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /* Half-step + odd sizes the marketing handoff uses (18/22/26/34/38/52px
         rhythm) but Tailwind's default scale skips. Mirrors the design file's
         spacing steps; update together with packages/ui/src/tokens.ts. */
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '8.5': '2.125rem',
        '9.5': '2.375rem',
        13: '3.25rem'
      },
      colors: {
        brand: {
          50: '#FDF0E9',
          100: '#FBE0D2',
          200: '#F7C2A6',
          300: '#F2A47A',
          400: '#F17A48',
          500: '#F04E17',
          600: '#D8480E',
          700: '#C6420E',
          800: '#A3350B',
          900: '#7A2808',
          soft: '#FDF0E9',
          deep: '#C6420E'
        },
        neutral: {
          0: '#ffffff',
          50: '#FBFAF9',
          100: '#F5F3F1',
          200: '#EBE7E3',
          300: '#DDD6D0',
          400: '#A79C93',
          500: '#857A72',
          600: '#6B615A',
          700: '#57504A',
          800: '#453F3A',
          900: '#38312B'
        },
        success: { 50: '#E9F7EF', soft: '#E9F7EF', 500: '#2E9E62', 600: '#268552', text: '#1D6B41' },
        warning: { 50: '#FDF4E6', soft: '#FDF4E6', 500: '#B77714', 600: '#9C6410', text: '#7A4F0C' },
        error: { 50: '#FCEDEA', soft: '#FCEDEA', 500: '#C93A22', 600: '#A92F1B', text: '#7A2314' },
        info: { 50: '#EFF4FE', soft: '#EFF4FE', 500: '#2563EB', 600: '#1D4FC0', text: '#1E3A8A' }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        /** Alias of `sans` — kept so existing `font-display` usages resolve unchanged. */
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        sm: '9px',
        md: '12px',
        lg: '16px',
        xl: '22px'
      },
      boxShadow: {
        sm: '0 1px 2px rgba(56, 49, 43, 0.08)',
        md: '0 8px 20px -8px rgba(56, 49, 43, 0.18)',
        lg: '0 24px 60px -34px rgba(56, 49, 43, 0.4)',
        /* card/lift/brand shadow tokens used across Lovable-ported pages, re-based
           onto the warm-orange/ink palette so pages using these class names stay consistent. */
        card: '0 1px 2px rgba(56, 49, 43, 0.05), 0 10px 26px -14px rgba(56, 49, 43, 0.16)',
        lift: '0 2px 6px rgba(56, 49, 43, 0.06), 0 24px 60px -34px rgba(56, 49, 43, 0.4)',
        brand: '0 10px 26px -10px rgba(240, 78, 23, 0.45)'
      }
    }
  },
  plugins: []
};
