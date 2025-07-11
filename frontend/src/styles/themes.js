/**
 * Booktarr Theme Configuration
 * 
 * This file contains all theme definitions for easy customization.
 * To change the app's appearance, modify the theme values here.
 */

// Default Dark Theme (Sonarr-inspired)
export const darkTheme = {
  name: 'dark',
  colors: {
    // Main backgrounds
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
  },
  typography: {
    fontFamily: {
      primary: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', 'monospace']
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem'
  }
};

// Light Theme Alternative
export const lightTheme = {
  name: 'light',
  colors: {
    // Main backgrounds
    bg: '#ffffff',
    surface: '#f8f9fa',
    surface2: '#e9ecef',
    surface3: '#dee2e6',
    
    // Borders and dividers
    border: '#d1d5db',
    borderLight: '#e5e7eb',
    
    // Text colors
    text: '#111827',
    textSecondary: '#4b5563',
    textMuted: '#6b7280',
    textDisabled: '#9ca3af',
    
    // Brand colors
    accent: '#f39c12',
    accentHover: '#e67e22',
    
    // Status colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    // Semantic colors
    wanted: '#f59e0b',
    monitored: '#10b981',
    unmonitored: '#9ca3af',
    
    // Interactive states
    hover: '#f3f4f6',
    active: '#e5e7eb',
    focus: '#f39c12',
  },
  typography: darkTheme.typography, // Reuse typography
  spacing: darkTheme.spacing,       // Reuse spacing
  borderRadius: darkTheme.borderRadius // Reuse border radius
};

// Blue Theme Alternative
export const blueTheme = {
  ...darkTheme,
  name: 'blue',
  colors: {
    ...darkTheme.colors,
    // Override accent colors for blue theme
    accent: '#3b82f6',
    accentHover: '#2563eb',
    focus: '#3b82f6',
    wanted: '#3b82f6',
    info: '#60a5fa'
  }
};

// Purple Theme Alternative
export const purpleTheme = {
  ...darkTheme,
  name: 'purple',
  colors: {
    ...darkTheme.colors,
    // Override accent colors for purple theme
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    focus: '#8b5cf6',
    wanted: '#8b5cf6',
    info: '#a78bfa'
  }
};

// Green Theme Alternative
export const greenTheme = {
  ...darkTheme,
  name: 'green',
  colors: {
    ...darkTheme.colors,
    // Override accent colors for green theme
    accent: '#10b981',
    accentHover: '#059669',
    focus: '#10b981',
    wanted: '#10b981',
    info: '#34d399'
  }
};

// Export all themes
export const themes = {
  dark: darkTheme,
  light: lightTheme,
  blue: blueTheme,
  purple: purpleTheme,
  green: greenTheme
};

// Default theme
export const defaultTheme = darkTheme;

/**
 * Theme utility functions
 */
export const getTheme = (themeName = 'dark') => {
  return themes[themeName] || defaultTheme;
};

export const applyTheme = (themeName = 'dark') => {
  const theme = getTheme(themeName);
  const root = document.documentElement;
  
  // Apply CSS custom properties
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--booktarr-${key}`, value);
  });
  
  // Apply typography
  root.style.setProperty('--booktarr-font-primary', theme.typography.fontFamily.primary.join(', '));
  root.style.setProperty('--booktarr-font-mono', theme.typography.fontFamily.mono.join(', '));
  
  return theme;
};

export const getThemeList = () => {
  return Object.keys(themes).map(key => ({
    key,
    name: themes[key].name,
    displayName: key.charAt(0).toUpperCase() + key.slice(1)
  }));
};