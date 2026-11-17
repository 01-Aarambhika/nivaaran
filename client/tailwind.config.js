/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        'border-hairline': 'var(--border-hairline)',
        'border-input': 'var(--border-input)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        brand: {
          primary: 'var(--brand-primary)',
          'primary-hover': '#132E23',
          secondary: 'var(--brand-secondary)',
        },
        status: {
          pending: {
            text: '#B45309',
            border: '#F59E0B',
            bg: '#FFFBEB',
          },
          review: {
            text: '#1E3A5F',
            border: '#3B82F6',
            bg: '#EFF6FF',
          },
          escalated: {
            text: '#B91C1C',
            border: '#EF4444',
            bg: '#FEF2F2',
          },
          resolved: {
            text: '#047857',
            border: '#10B981',
            bg: '#ECFDF5',
          },
        },
      },
      fontFamily: {
        sans: ['Public Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
        full: '4px',
      },
      boxShadow: {
        none: 'none',
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
      },
    },
  },
  plugins: [],
};
