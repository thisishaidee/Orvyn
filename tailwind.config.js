/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    // Device ranges: mobile 360-767, tablet 768-1023, laptop 1024-1439, desktop 1440+.
    // `sm` is only used for large phones; layout decisions live at md / lg / xl.
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1440px',
    },
    extend: {
      // Every colour reads the palette variables defined in src/index.css (single source of truth).
      colors: {
        brand: {
          navy: 'rgb(var(--ap-navy) / <alpha-value>)', // #17294B primary navy
          blue: 'rgb(var(--ap-blue) / <alpha-value>)', // #315B91 primary blue
          sky: 'rgb(var(--ap-sky) / <alpha-value>)', // #6C8FCB secondary blue
          pale: 'rgb(var(--ap-pale) / <alpha-value>)', // #A9C4E8 pale blue
          mist: 'rgb(var(--ap-mist) / <alpha-value>)', // #EAF2FC soft surface
          lavender: 'rgb(var(--ap-lavender) / <alpha-value>)', // gradients only
        },
        canvas: 'rgb(var(--ap-canvas) / <alpha-value>)', // #F8FAFD main background
        surface: 'rgb(var(--ap-surface) / <alpha-value>)', // #FFFFFF cards
        ink: {
          DEFAULT: 'rgb(var(--ap-ink) / <alpha-value>)', // #263449 primary text
          soft: 'rgb(var(--ap-ink-soft) / <alpha-value>)', // supporting text (5.9:1 on white)
          mute: 'rgb(var(--ap-ink-mute) / <alpha-value>)', // placeholders, captions (4.4:1)
        },
        line: {
          DEFAULT: 'rgb(var(--ap-line) / <alpha-value>)',
          strong: 'rgb(var(--ap-line-strong) / <alpha-value>)',
        },
        // Semantic colours: meaning only, never decoration
        success: { DEFAULT: 'rgb(var(--ap-success) / <alpha-value>)', soft: 'rgb(var(--ap-success-soft) / <alpha-value>)' },
        warning: { DEFAULT: 'rgb(var(--ap-warning) / <alpha-value>)', soft: 'rgb(var(--ap-warning-soft) / <alpha-value>)' },
        danger: {
          DEFAULT: 'rgb(var(--ap-danger) / <alpha-value>)',
          dark: 'rgb(var(--ap-danger-dark) / <alpha-value>)',
          soft: 'rgb(var(--ap-danger-soft) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      // Typography tokens: [size, { lineHeight, letterSpacing, fontWeight }]
      fontSize: {
        'page-sm': ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        page: ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em', fontWeight: '600' }],
        section: ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        support: ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        label: ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '500' }],
        overline: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em', fontWeight: '600' }],
        'figure-sm': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em', fontWeight: '600' }],
        figure: ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em', fontWeight: '600' }],
        'figure-lg': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.03em', fontWeight: '600' }],
      },
      borderRadius: {
        control: '0.75rem', // 12px buttons, inputs
        card: '1rem', // 16px cards
        panel: '1.5rem', // 24px modals, hero panels
      },
      boxShadow: {
        card: '0 1px 2px rgb(23 41 75 / 0.04), 0 8px 24px -14px rgb(23 41 75 / 0.14)',
        raised: '0 2px 4px rgb(23 41 75 / 0.05), 0 16px 32px -16px rgb(23 41 75 / 0.2)',
        pop: '0 24px 64px -16px rgb(23 41 75 / 0.35)',
      },
      backgroundImage: {
        // Used selectively: featured panels and soft highlights only
        'brand-gradient': 'var(--ap-gradient-brand)',
        'soft-gradient': 'var(--ap-gradient-soft)',
        'navy-gradient': 'var(--ap-gradient-navy)', // sidebar and mobile top bar
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-up': { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        'drawer-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-in': 'fade-in 160ms ease-out',
        'sheet-up': 'sheet-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'drawer-in': 'drawer-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
