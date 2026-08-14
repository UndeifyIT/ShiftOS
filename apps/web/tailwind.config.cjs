/**
 * Mirrors packages/ui/src/tokens.ts — Tailwind's CJS config can't import that
 * ESM TS module directly, so these values are kept in sync by hand. Update
 * both together.
 */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          soft: '#ccfbf1',
          deep: '#0f766e'
        },
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
          900: '#111111'
        },
        success: { 50: '#ecfdf5', soft: '#d1fae5', 500: '#10b981', 600: '#059669', text: '#065f46' },
        warning: { 50: '#fffbeb', soft: '#fef3c7', 500: '#f59e0b', 600: '#d97706', text: '#92400e' },
        error: { 50: '#fef2f2', soft: '#fee2e2', 500: '#ef4444', 600: '#dc2626', text: '#991b1b' },
        info: { 50: '#eff6ff', soft: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', text: '#1e40af' }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        /** Marketing headlines + onboarding step titles only — never dashboards/tables. */
        display: ['Newsreader', 'Georgia', '"Times New Roman"', 'serif']
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px'
      },
      boxShadow: {
        sm: '0 1px 2px rgba(17, 17, 17, 0.06)',
        md: '0 2px 8px rgba(17, 17, 17, 0.08)',
        lg: '0 8px 24px rgba(17, 17, 17, 0.10)',
        /* Lovable-era card/lift/brand shadow tokens, re-based onto the graphite +
           teal palette so pages still using these class names stay consistent. */
        card: '0 1px 2px rgba(17, 17, 17, 0.04), 0 8px 24px -12px rgba(17, 17, 17, 0.10)',
        lift: '0 2px 4px rgba(17, 17, 17, 0.05), 0 18px 40px -18px rgba(17, 17, 17, 0.16)',
        brand: '0 10px 26px -10px rgba(20, 184, 166, 0.45)'
      }
    }
  },
  plugins: []
};
