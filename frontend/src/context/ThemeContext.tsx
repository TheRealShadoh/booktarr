/**
 * Theme Context for managing application theming with scheduled dark mode support
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getTheme, applyTheme, getThemeList, defaultTheme } from '../styles/themes';

interface ScheduledDarkModeConfig {
  enabled: boolean;
  startTime: string; // HH:MM format (e.g., "21:00")
  endTime: string;   // HH:MM format (e.g., "08:00")
  darkTheme: string; // Theme to use during scheduled dark hours
  lightTheme: string; // Theme to use during light hours
}

interface ThemeContextType {
  currentTheme: string;
  setTheme: (themeName: string, skipSchedule?: boolean) => void;
  availableThemes: { key: string; name: string; displayName: string }[];
  themeConfig: typeof defaultTheme;
  scheduledDarkMode: ScheduledDarkModeConfig;
  setScheduledDarkMode: (config: ScheduledDarkModeConfig) => void;
  isScheduledDarkModeActive: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<string>('dark');
  const [themeConfig, setThemeConfig] = useState(defaultTheme);
  const [scheduledDarkMode, setScheduledDarkModeState] = useState<ScheduledDarkModeConfig>({
    enabled: false,
    startTime: '21:00',
    endTime: '08:00',
    darkTheme: 'dark',
    lightTheme: 'light'
  });
  const [isScheduledDarkModeActive, setIsScheduledDarkModeActive] = useState(false);

  // Check if current time is within scheduled dark mode hours
  const isTimeInDarkModeHours = (startTime: string, endTime: string): boolean => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle case where end time is next day (e.g., 21:00 to 08:00)
    if (endMinutes < startMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('booktarr-theme');
    const savedScheduledDarkMode = localStorage.getItem('booktarr-scheduled-dark-mode');

    if (savedScheduledDarkMode) {
      try {
        const config = JSON.parse(savedScheduledDarkMode);
        setScheduledDarkModeState(config);

        // Apply scheduled theme if enabled
        if (config.enabled && isTimeInDarkModeHours(config.startTime, config.endTime)) {
          setIsScheduledDarkModeActive(true);
          applyThemeInternal(config.darkTheme);
          return;
        }
      } catch (error) {
        console.error('Failed to load scheduled dark mode config:', error);
      }
    }

    if (savedTheme && getTheme(savedTheme)) {
      applyThemeInternal(savedTheme);
    } else {
      // Apply default theme
      applyThemeInternal('dark');
    }
  }, []);

  // Set up interval to check scheduled dark mode (disabled in test environments)
  useEffect(() => {
    if (!scheduledDarkMode.enabled) return;

    // Don't run scheduled dark mode checks in test environments
    const isTestEnvironment = navigator.webdriver || (window as any).Cypress;
    if (isTestEnvironment) return;

    const checkInterval = setInterval(() => {
      const isInDarkHours = isTimeInDarkModeHours(scheduledDarkMode.startTime, scheduledDarkMode.endTime);

      if (isInDarkHours && !isScheduledDarkModeActive) {
        // Switch to dark theme
        setIsScheduledDarkModeActive(true);
        applyThemeInternal(scheduledDarkMode.darkTheme);
      } else if (!isInDarkHours && isScheduledDarkModeActive) {
        // Switch to light theme
        setIsScheduledDarkModeActive(false);
        applyThemeInternal(scheduledDarkMode.lightTheme);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [scheduledDarkMode, isScheduledDarkModeActive]);

  const applyThemeInternal = (themeName: string) => {
    try {
      const theme = applyTheme(themeName);
      setCurrentTheme(themeName);
      setThemeConfig(theme);

      window.dispatchEvent(new CustomEvent('booktarr-theme-change', {
        detail: { theme: themeName, config: theme }
      }));
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  };

  const setTheme = (themeName: string, skipSchedule = false) => {
    try {
      // If scheduled dark mode is active and user tries to change theme, disable scheduling for this session
      if (skipSchedule || isScheduledDarkModeActive) {
        setIsScheduledDarkModeActive(false);
      }

      applyThemeInternal(themeName);

      // Save to localStorage
      localStorage.setItem('booktarr-theme', themeName);
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  };

  const setScheduledDarkMode = (config: ScheduledDarkModeConfig) => {
    setScheduledDarkModeState(config);
    localStorage.setItem('booktarr-scheduled-dark-mode', JSON.stringify(config));

    // Apply appropriate theme immediately
    if (config.enabled && isTimeInDarkModeHours(config.startTime, config.endTime)) {
      setIsScheduledDarkModeActive(true);
      applyThemeInternal(config.darkTheme);
    } else {
      setIsScheduledDarkModeActive(false);
      applyThemeInternal(config.lightTheme);
    }
  };

  const availableThemes = getThemeList();

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    availableThemes,
    themeConfig,
    scheduledDarkMode,
    setScheduledDarkMode,
    isScheduledDarkModeActive
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