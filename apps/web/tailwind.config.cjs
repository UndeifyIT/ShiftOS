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
          50: '#fff4ed',
          100: '#ffe6d5',
          200: '#ffc9a8',
          300: '#ffa670',
          400: '#ff7a38',
          500: '#f4551c',
          600: '#e13d0f',
          700: '#ba2c0d',
          800: '#942512',
          900: '#782112'
        },
        neutral: {
          0: '#ffffff',
          50: '#fdf8f5',
          100: '#f7efe9',
          200: '#ece1d9',
          300: '#dccdc0',
          400: '#b6a696',
          500: '#8a7a6b',
          600: '#645749',
          700: '#453b31',
          800: '#2b2620',
          900: '#1a1714'
        },
        success: { 50: '#eefcf3', 500: '#1fa864', 600: '#178a51', text: '#0f6b3f' },
        warning: { 50: '#fff8e8', 500: '#d69a1f', 600: '#b17f16', text: '#7a5a10' },
        error: { 50: '#fdeeec', 500: '#d43d2c', 600: '#b32e1f', text: '#8f2517' },
        info: { 50: '#eef4fd', 500: '#2f6fd6', 600: '#255cb3', text: '#1d4788' }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Inter',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ]
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px'
      },
      boxShadow: {
        sm: '0 1px 2px rgba(26, 23, 20, 0.06)',
        md: '0 4px 12px rgba(26, 23, 20, 0.08)',
        lg: '0 12px 32px rgba(26, 23, 20, 0.12)'
      }
    }
  },
  plugins: []
};
