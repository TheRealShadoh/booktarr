/**
 * Theme Context for managing application theming
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getTheme, applyTheme, getThemeList, defaultTheme } from '../styles/themes';

interface ThemeContextType {
  currentTheme: string;
  setTheme: (themeName: string) => void;
  availableThemes: { key: string; name: string; displayName: string }[];
  themeConfig: typeof defaultTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<string>('dark');
  const [themeConfig, setThemeConfig] = useState(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('booktarr-theme');
    if (savedTheme && getTheme(savedTheme)) {
      setTheme(savedTheme);
    } else {
      // Apply default theme
      const theme = applyTheme('dark');
      setThemeConfig(theme);
    }
  }, []);

  const setTheme = (themeName: string) => {
    try {
      // Apply the theme and get the config
      const theme = applyTheme(themeName);
      
      // Update state
      setCurrentTheme(themeName);
      setThemeConfig(theme);
      
      // Save to localStorage
      localStorage.setItem('booktarr-theme', themeName);
      
      // Dispatch custom event for components that need to react to theme changes
      window.dispatchEvent(new CustomEvent('booktarr-theme-change', { 
        detail: { theme: themeName, config: theme } 
      }));
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  };

  const availableThemes = getThemeList();

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    availableThemes,
    themeConfig
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;