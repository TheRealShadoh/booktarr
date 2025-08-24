/**
 * Top Navigation Bar - Sonarr/Radarr-inspired design
 * Primary navigation with clean, horizontal layout
 */
import React from 'react';
import { CurrentPage } from '../context/AppContext';

interface TopNavigationProps {
  currentPage: CurrentPage;
  onPageChange: (page: CurrentPage) => void;
  onSearchToggle: () => void;
  pendingCount?: number;
}

const TopNavigation: React.FC<TopNavigationProps> = ({
  currentPage,
  onPageChange,
  onSearchToggle,
  pendingCount = 0
}) => {
  const primaryNavItems: { page: CurrentPage; label: string; icon: string; badge?: number }[] = [
    { page: 'library', label: 'Library', icon: '📚' },
    { page: 'series-management', label: 'Series', icon: '📖' },
    { page: 'release-calendar', label: 'Calendar', icon: '📅' },
    { page: 'analytics', label: 'Analytics', icon: '📊' },
    { page: 'wanted', label: 'Wanted', icon: '⚡', badge: pendingCount > 0 ? pendingCount : undefined },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-800 h-14 px-4">
      <div className="flex items-center h-full">
        {/* Logo */}
        <div className="flex items-center mr-8">
          <img src="/logo.png" alt="BookTarr" className="h-8 w-8 mr-2" />
          <span className="text-xl font-bold text-orange-500">BookTarr</span>
        </div>

        {/* Primary Navigation */}
        <div className="flex items-center flex-1 space-x-1">
          {primaryNavItems.map((item) => (
            <button
              key={item.page}
              onClick={() => onPageChange(item.page)}
              className={`
                relative px-4 py-3 h-14 flex items-center space-x-2 text-sm font-medium
                transition-all duration-200 border-b-2
                ${currentPage === item.page 
                  ? 'text-orange-500 bg-gray-800/50 border-orange-500' 
                  : 'text-gray-300 hover:text-white border-transparent hover:bg-gray-800/30'
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-yellow-500 text-black rounded">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          {/* Search Button */}
          <button
            onClick={onSearchToggle}
            className="p-2 rounded hover:bg-gray-800 transition-colors group"
            aria-label="Search (Ctrl+K)"
          >
            <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Settings */}
          <button
            onClick={() => onPageChange('settings')}
            className={`p-2 rounded transition-colors ${
              currentPage === 'settings' 
                ? 'bg-gray-800 text-orange-500' 
                : 'hover:bg-gray-800 text-gray-400 hover:text-white'
            }`}
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TopNavigation;