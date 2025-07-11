module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Booktarr theme based on Sonarr's actual color scheme
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        booktarr: {
          // Main backgrounds - using CSS custom properties for dynamic theming
          bg: 'var(--booktarr-bg)',
          surface: 'var(--booktarr-surface)',
          surface2: 'var(--booktarr-surface2)',
          surface3: 'var(--booktarr-surface3)',
          
          // Borders and dividers
          border: 'var(--booktarr-border)',
          borderLight: 'var(--booktarr-borderLight)',
          
          // Text colors
          text: 'var(--booktarr-text)',
          textSecondary: 'var(--booktarr-textSecondary)',
          textMuted: 'var(--booktarr-textMuted)',
          textDisabled: 'var(--booktarr-textDisabled)',
          
          // Brand colors
          accent: 'var(--booktarr-accent)',
          accentHover: 'var(--booktarr-accentHover)',
          
          // Status colors
          success: 'var(--booktarr-success)',
          warning: 'var(--booktarr-warning)',
          error: 'var(--booktarr-error)',
          info: 'var(--booktarr-info)',
          
          // Semantic colors
          wanted: 'var(--booktarr-wanted)',
          monitored: 'var(--booktarr-monitored)',
          unmonitored: 'var(--booktarr-unmonitored)',
          
          // Interactive states
          hover: 'var(--booktarr-hover)',
          active: 'var(--booktarr-active)',
          focus: 'var(--booktarr-focus)',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    }
  },
  plugins: []
}