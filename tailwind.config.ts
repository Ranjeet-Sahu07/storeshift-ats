import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0D2B2A',
          50: '#E8ECEC',
          100: '#C7D2D1',
          400: '#33504E',
          600: '#173B39',
          900: '#0D2B2A',
        },
        brand: {
          50: '#EAF7EE',
          100: '#CDEBD6',
          200: '#9FDBB0',
          300: '#6FCB8B',
          400: '#48BB6B',
          500: '#28A745',
          600: '#1F8A38',
          700: '#186B2C',
          800: '#124F21',
          900: '#0C3717',
        },
        lime: {
          DEFAULT: '#7BC043',
        },
        mist: '#F4F6F8',
        amber: { 500: '#F5A623' },
        coral: { 500: '#E5484D' },
      },
      fontFamily: {
        display: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(13, 43, 42, 0.08)',
        card: '0 1px 2px rgba(13,43,42,0.06), 0 8px 24px -8px rgba(13,43,42,0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
