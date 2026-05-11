/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Aeonik', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        'aeonik': ['Aeonik', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
      fontSize: {
        // Semantic typography scale
        'display-2xl': ['4.5rem', { lineHeight: '5rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-xl': ['3.75rem', { lineHeight: '4.5rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '3.75rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-sm': ['1.875rem', { lineHeight: '2.375rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-xs': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-lg': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'heading-md': ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600' }],
        'heading-sm': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body': ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
        'micro': ['0.6875rem', { lineHeight: '0.875rem', fontWeight: '500', letterSpacing: '0.02em' }],
      },
      fontWeight: {
        'thin': '100',
        'extralight': '200',
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
        'black': '900',
        'aeonik-regular': '400',
        'aeonik-bold': '700',
      },
      colors: {
        // Semantic surface colors (backgrounds)
        surface: {
          DEFAULT: '#0a0a0a',    // Page background (darkest)
          raised: '#0f0f0f',     // Slightly elevated
          card: '#1a1a1a',       // Card background
          elevated: '#2a2a2a',   // Elevated elements / borders
          hover: '#3a3a3a',      // Hover states
        },
        // Border colors
        border: {
          DEFAULT: '#2a2a2a',
          subtle: '#1f1f1f',
          strong: '#3a3a3a',
          focus: '#d8e9ea',
        },
        // Text colors
        content: {
          primary: '#ffffff',
          secondary: '#e5e5e5',
          muted: '#a0a0a0',
          subtle: '#666666',
          inverse: '#0a0a0a',
        },
        // Brand / accent
        accent: {
          DEFAULT: '#d8e9ea',    // Primary mint/teal
          hover: '#b8d4d6',
          subtle: '#d8e9ea1a',   // 10% opacity bg
          muted: '#d8e9ea33',    // 20% opacity bg
        },
        // Semantic status colors
        success: {
          DEFAULT: '#10b981',
          hover: '#059669',
          subtle: '#10b9811a',
          muted: '#10b98133',
        },
        danger: {
          DEFAULT: '#ef4444',
          hover: '#dc2626',
          subtle: '#ef44441a',
          muted: '#ef444433',
        },
        warning: {
          DEFAULT: '#f59e0b',
          hover: '#d97706',
          subtle: '#f59e0b1a',
          muted: '#f59e0b33',
        },
        info: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          subtle: '#3b82f61a',
          muted: '#3b82f633',
        },
        // Chart colors
        chart: {
          up: '#26a69a',
          down: '#ef5350',
          grid: '#2a2e39',
          axis: '#d1d4dc',
        },
      },
      spacing: {
        // Semantic spacing (in addition to Tailwind defaults)
        'xs': '0.25rem',   // 4px
        'sm': '0.5rem',    // 8px
        'md': '0.75rem',   // 12px
        'lg': '1rem',      // 16px
        'xl': '1.5rem',    // 24px
        '2xl': '2rem',     // 32px
        '3xl': '3rem',     // 48px
        '4xl': '4rem',     // 64px
      },
      borderRadius: {
        'xs': '0.25rem',   // 4px
        'sm': '0.375rem',  // 6px
        'md': '0.5rem',    // 8px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
        '2xl': '1.5rem',   // 24px
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 24px 0 rgba(0, 0, 0, 0.5)',
        'glow': '0 0 20px 0 rgba(216, 233, 234, 0.2)',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
};
