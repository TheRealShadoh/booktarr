/**
 * Theme Selector Component
 * Allows users to switch between different visual themes
 */
import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeSelector: React.FC = () => {
  const { currentTheme, setTheme, availableThemes } = useTheme();

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

  return (
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
  );
};

export default ThemeSelector;