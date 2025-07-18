import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('booktarr-theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Default to dark theme
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('booktarr-theme', theme);

    // Apply theme to document
    applyTheme(theme);
  }, [theme]);

  const applyTheme = (selectedTheme: Theme) => {
    const root = document.documentElement;
    
    if (selectedTheme === 'auto') {
      // Use system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(systemPrefersDark);
      
      if (systemPrefersDark) {
        root.setAttribute('data-theme', 'dark');
        applyDarkTheme(root);
      } else {
        root.setAttribute('data-theme', 'light');
        applyLightTheme(root);
      }
    } else {
      setIsDark(selectedTheme === 'dark');
      root.setAttribute('data-theme', selectedTheme);
      
      if (selectedTheme === 'dark') {
        applyDarkTheme(root);
      } else {
        applyLightTheme(root);
      }
    }
  };

  const applyDarkTheme = (root: HTMLElement) => {
    root.style.setProperty('--booktarr-bg', '#1e1e1e');
    root.style.setProperty('--booktarr-surface', '#252525');
    root.style.setProperty('--booktarr-surface2', '#2f2f2f');
    root.style.setProperty('--booktarr-surface3', '#3a3a3a');
    root.style.setProperty('--booktarr-border', '#404040');
    root.style.setProperty('--booktarr-borderLight', '#4a4a4a');
    root.style.setProperty('--booktarr-text', '#ffffff');
    root.style.setProperty('--booktarr-textSecondary', '#cccccc');
    root.style.setProperty('--booktarr-textMuted', '#999999');
    root.style.setProperty('--booktarr-textDisabled', '#666666');
    root.style.setProperty('--booktarr-accent', '#f39c12');
    root.style.setProperty('--booktarr-accentHover', '#e67e22');
    root.style.setProperty('--booktarr-success', '#27ae60');
    root.style.setProperty('--booktarr-warning', '#f39c12');
    root.style.setProperty('--booktarr-error', '#e74c3c');
    root.style.setProperty('--booktarr-info', '#3498db');
    root.style.setProperty('--booktarr-wanted', '#e67e22');
    root.style.setProperty('--booktarr-monitored', '#27ae60');
    root.style.setProperty('--booktarr-unmonitored', '#95a5a6');
    root.style.setProperty('--booktarr-hover', '#363636');
    root.style.setProperty('--booktarr-active', '#404040');
    root.style.setProperty('--booktarr-focus', '#f39c12');
  };

  const applyLightTheme = (root: HTMLElement) => {
    root.style.setProperty('--booktarr-bg', '#ffffff');
    root.style.setProperty('--booktarr-surface', '#f8f9fa');
    root.style.setProperty('--booktarr-surface2', '#e9ecef');
    root.style.setProperty('--booktarr-surface3', '#dee2e6');
    root.style.setProperty('--booktarr-border', '#ced4da');
    root.style.setProperty('--booktarr-borderLight', '#adb5bd');
    root.style.setProperty('--booktarr-text', '#212529');
    root.style.setProperty('--booktarr-textSecondary', '#495057');
    root.style.setProperty('--booktarr-textMuted', '#6c757d');
    root.style.setProperty('--booktarr-textDisabled', '#adb5bd');
    root.style.setProperty('--booktarr-accent', '#f39c12');
    root.style.setProperty('--booktarr-accentHover', '#e67e22');
    root.style.setProperty('--booktarr-success', '#28a745');
    root.style.setProperty('--booktarr-warning', '#ffc107');
    root.style.setProperty('--booktarr-error', '#dc3545');
    root.style.setProperty('--booktarr-info', '#17a2b8');
    root.style.setProperty('--booktarr-wanted', '#fd7e14');
    root.style.setProperty('--booktarr-monitored', '#28a745');
    root.style.setProperty('--booktarr-unmonitored', '#6c757d');
    root.style.setProperty('--booktarr-hover', '#f8f9fa');
    root.style.setProperty('--booktarr-active', '#e9ecef');
    root.style.setProperty('--booktarr-focus', '#f39c12');
  };

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('auto');
    } else {
      setTheme('dark');
    }
  };

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
        applyTheme('auto');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme,
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};