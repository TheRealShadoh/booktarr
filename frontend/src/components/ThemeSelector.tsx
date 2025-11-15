/**
 * Theme Selector Component with Scheduled Dark Mode
 * Allows users to switch between different visual themes and configure scheduled dark mode for night reading
 */
import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeSelector: React.FC = () => {
  const { currentTheme, setTheme, availableThemes, scheduledDarkMode, setScheduledDarkMode, isScheduledDarkModeActive } = useTheme();
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);

  const handleThemeChange = (themeName: string) => {
    setTheme(themeName);
  };

  const getThemePreview = (themeName: string) => {
    // Define preview colors for each theme
    const previews: Record<string, { accent: string; bg: string; surface: string }> = {
      dark: { accent: '#f39c12', bg: '#1e1e1e', surface: '#252525' },
      light: { accent: '#f39c12', bg: '#ffffff', surface: '#f8f9fa' },
      blue: { accent: '#3b82f6', bg: '#1e1e1e', surface: '#252525' },
      purple: { accent: '#8b5cf6', bg: '#1e1e1e', surface: '#252525' },
      green: { accent: '#10b981', bg: '#1e1e1e', surface: '#252525' }
    };

    return previews[themeName] || previews.dark;
  };

  const handleScheduleToggle = (enabled: boolean) => {
    setScheduledDarkMode({ ...scheduledDarkMode, enabled });
  };

  const handleScheduleChange = (field: 'startTime' | 'endTime' | 'darkTheme' | 'lightTheme', value: string) => {
    setScheduledDarkMode({ ...scheduledDarkMode, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h3 className="text-lg font-semibold text-booktarr-text">Theme Selection</h3>
          <p className="text-sm text-booktarr-textSecondary">Choose your preferred visual theme</p>
        </div>
        <div className="booktarr-card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableThemes.map((theme) => {
              const preview = getThemePreview(theme.key);
              const isSelected = currentTheme === theme.key;

              return (
                <button
                  key={theme.key}
                  onClick={() => handleThemeChange(theme.key)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-200
                    ${isSelected
                      ? 'border-booktarr-accent bg-booktarr-surface2'
                      : 'border-booktarr-border bg-booktarr-surface hover:border-booktarr-borderLight'
                    }
                  `}
                  title={`Switch to ${theme.displayName} theme`}
                >
                  {/* Theme Preview */}
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="flex space-x-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preview.bg }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preview.surface }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preview.accent }}
                      />
                    </div>
                    {isSelected && (
                      <div className="flex items-center text-booktarr-accent">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Theme Name */}
                  <div className="text-left">
                    <p className={`font-medium ${isSelected ? 'text-booktarr-accent' : 'text-booktarr-text'}`}>
                      {theme.displayName}
                    </p>
                    <p className="text-xs text-booktarr-textMuted">
                      {theme.key === 'dark' && 'Default Sonarr-inspired theme'}
                      {theme.key === 'light' && 'Clean light theme'}
                      {theme.key === 'blue' && 'Cool blue accents'}
                      {theme.key === 'purple' && 'Rich purple accents'}
                      {theme.key === 'green' && 'Natural green accents'}
                    </p>
                  </div>

                  {/* Active indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-booktarr-accent rounded-full"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Theme Information */}
          <div className="mt-4 p-3 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
            <h4 className="text-sm font-medium text-booktarr-text mb-1">Current Theme: {availableThemes.find(t => t.key === currentTheme)?.displayName}</h4>
            <p className="text-xs text-booktarr-textSecondary">
              Themes change the color scheme and visual appearance of Booktarr.
              Your selection is automatically saved.
            </p>
          </div>
        </div>
      </div>

      {/* Scheduled Dark Mode Settings */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h3 className="text-lg font-semibold text-booktarr-text">Night Mode Scheduling</h3>
          <p className="text-sm text-booktarr-textSecondary">Automatic theme switching for comfortable night reading</p>
        </div>
        <div className="booktarr-card-body space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-3 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
            <div>
              <p className="font-medium text-booktarr-text">Enable Scheduled Dark Mode</p>
              <p className="text-xs text-booktarr-textSecondary">Automatically switch themes at scheduled times</p>
              {isScheduledDarkModeActive && (
                <p className="text-xs text-booktarr-success mt-1">✓ Currently active (night reading mode)</p>
              )}
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={scheduledDarkMode.enabled}
                onChange={(e) => handleScheduleToggle(e.target.checked)}
                className="w-5 h-5 rounded accent-booktarr-accent"
              />
            </label>
          </div>

          {/* Schedule Settings - Only show if enabled */}
          {scheduledDarkMode.enabled && (
            <div className="space-y-3 p-3 bg-booktarr-surface rounded-lg">
              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-booktarr-text mb-2">
                  Dark Mode Starts At
                </label>
                <input
                  type="time"
                  value={scheduledDarkMode.startTime}
                  onChange={(e) => handleScheduleChange('startTime', e.target.value)}
                  className="w-full px-3 py-2 bg-booktarr-surface2 border border-booktarr-border rounded text-booktarr-text text-sm focus:outline-none focus:ring-2 focus:ring-booktarr-accent"
                />
                <p className="text-xs text-booktarr-textMuted mt-1">Recommended: 21:00 (9 PM)</p>
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-booktarr-text mb-2">
                  Dark Mode Ends At
                </label>
                <input
                  type="time"
                  value={scheduledDarkMode.endTime}
                  onChange={(e) => handleScheduleChange('endTime', e.target.value)}
                  className="w-full px-3 py-2 bg-booktarr-surface2 border border-booktarr-border rounded text-booktarr-text text-sm focus:outline-none focus:ring-2 focus:ring-booktarr-accent"
                />
                <p className="text-xs text-booktarr-textMuted mt-1">Recommended: 08:00 (8 AM)</p>
              </div>

              {/* Dark Theme Selection */}
              <div>
                <label className="block text-sm font-medium text-booktarr-text mb-2">
                  Night Theme
                </label>
                <select
                  value={scheduledDarkMode.darkTheme}
                  onChange={(e) => handleScheduleChange('darkTheme', e.target.value)}
                  className="w-full px-3 py-2 bg-booktarr-surface2 border border-booktarr-border rounded text-booktarr-text text-sm focus:outline-none focus:ring-2 focus:ring-booktarr-accent"
                >
                  {availableThemes.filter(t => t.key !== 'light').map(theme => (
                    <option key={theme.key} value={theme.key}>{theme.displayName}</option>
                  ))}
                </select>
              </div>

              {/* Light Theme Selection */}
              <div>
                <label className="block text-sm font-medium text-booktarr-text mb-2">
                  Day Theme
                </label>
                <select
                  value={scheduledDarkMode.lightTheme}
                  onChange={(e) => handleScheduleChange('lightTheme', e.target.value)}
                  className="w-full px-3 py-2 bg-booktarr-surface2 border border-booktarr-border rounded text-booktarr-text text-sm focus:outline-none focus:ring-2 focus:ring-booktarr-accent"
                >
                  {availableThemes.map(theme => (
                    <option key={theme.key} value={theme.key}>{theme.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="p-2 bg-booktarr-surface2 rounded border border-booktarr-border">
                <p className="text-xs text-booktarr-textSecondary">
                  💡 Tip: Schedule dark mode from evening to morning for comfortable night reading. Theme will automatically switch at the specified times.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;