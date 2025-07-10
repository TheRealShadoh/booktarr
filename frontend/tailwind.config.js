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
          // Main backgrounds - matching Sonarr's dark theme
          bg: '#1e1e1e',           // Main background
          surface: '#252525',       // Cards, panels
          surface2: '#2f2f2f',      // Elevated surfaces
          surface3: '#3a3a3a',      // Interactive elements
          
          // Borders and dividers
          border: '#404040',        // Standard borders
          borderLight: '#4a4a4a',   // Lighter borders
          
          // Text colors
          text: '#ffffff',          // Primary text
          textSecondary: '#cccccc', // Secondary text
          textMuted: '#999999',     // Muted text
          textDisabled: '#666666',  // Disabled text
          
          // Brand colors
          accent: '#f39c12',        // Orange accent (Sonarr-like)
          accentHover: '#e67e22',   // Darker orange on hover
          
          // Status colors
          success: '#27ae60',       // Green for success
          warning: '#f39c12',       // Orange for warnings
          error: '#e74c3c',         // Red for errors
          info: '#3498db',          // Blue for info
          
          // Semantic colors
          wanted: '#e67e22',        // Orange for wanted items
          monitored: '#27ae60',     // Green for monitored
          unmonitored: '#95a5a6',   // Gray for unmonitored
          
          // Interactive states
          hover: '#363636',         // Hover background
          active: '#404040',        // Active/pressed state
          focus: '#f39c12',         // Focus color
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