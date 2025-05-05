/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          dark: 'var(--v-bg-dark)',
          panel: 'var(--v-bg-panel)',
        },
        text: {
          primary: 'var(--v-text-primary)',
          secondary: 'var(--v-text-secondary)',
        },
        accent: {
          gold: 'var(--v-accent-gold)',
          copper: 'var(--v-accent-copper)',
        },
        border: {
          metal: 'var(--v-border-metal)',
        },
        emerald: {
          400: 'var(--v-emerald-400)',
          700: 'var(--v-emerald-700)',
        },
        wheat: {
          200: 'var(--v-wheat-200)',
          300: 'var(--v-wheat-300)',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Noto Sans', 'sans-serif'],
        symbol: ['Uncial Antiqua', 'cursive'],
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      borderWidth: {
        DEFAULT: 'var(--border-width)',
      },
      transitionDuration: {
        fast: 'var(--anim-fast)',
        normal: 'var(--anim-normal)',
      },
      transitionTimingFunction: {
        'ease-in': 'var(--easing-in)',
        'ease-out': 'var(--easing-out)',
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'var(--v-text-primary)',
            a: {
              color: 'var(--v-accent-gold)',
              '&:hover': {
                color: 'var(--v-accent-copper)',
              },
            },
            h1: {
              color: 'var(--v-accent-gold)',
              fontFamily: 'var(--font-display)',
            },
            h2: {
              color: 'var(--v-accent-gold)',
              fontFamily: 'var(--font-display)',
            },
            h3: {
              color: 'var(--v-accent-gold)',
              fontFamily: 'var(--font-display)',
            },
            h4: {
              color: 'var(--v-accent-gold)',
              fontFamily: 'var(--font-display)',
            },
            blockquote: {
              color: 'var(--v-text-secondary)',
              borderLeftColor: 'var(--v-border-metal)',
            },
            code: {
              color: 'var(--v-text-primary)',
              backgroundColor: 'var(--v-bg-panel)',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
            },
            pre: {
              backgroundColor: 'var(--v-bg-panel)',
              code: {
                backgroundColor: 'transparent',
              },
            },
            hr: {
              borderColor: 'var(--v-border-metal)',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 