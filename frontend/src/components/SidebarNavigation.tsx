/**
 * Sonarr-inspired sidebar navigation component
 */
import React from 'react';

type CurrentPage = 'library' | 'settings' | 'series' | 'authors' | 'wanted' | 'activity' | 'logs' | 'enhancement';

interface SidebarNavigationProps {
  currentPage: CurrentPage;
  onPageChange: (page: CurrentPage) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  isActive?: boolean;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  currentPage,
  onPageChange,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const navigationItems: NavigationItem[] = [
    {
      id: 'library',
      label: 'Library',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      isActive: currentPage === 'library'
    },
    {
      id: 'series',
      label: 'Series',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      badge: '12',
      isActive: currentPage === 'series'
    },
    {
      id: 'authors',
      label: 'Authors',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      isActive: currentPage === 'authors'
    },
    {
      id: 'enhancement',
      label: 'Enhancement',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      isActive: currentPage === 'enhancement'
    },
    {
      id: 'wanted',
      label: 'Wanted',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badge: '3',
      isActive: currentPage === 'wanted'
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      isActive: currentPage === 'activity'
    }
  ];

  const systemItems: NavigationItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      isActive: currentPage === 'settings'
    },
    {
      id: 'logs',
      label: 'System',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      isActive: currentPage === 'logs'
    }
  ];

  const handleItemClick = (itemId: string) => {
    onPageChange(itemId as CurrentPage);
  };

  const renderNavItem = (item: NavigationItem) => (
    <button
      key={item.id}
      onClick={() => handleItemClick(item.id)}
      className={`booktarr-sidebar-item w-full ${item.isActive ? 'active' : ''}`}
      title={isCollapsed ? item.label : undefined}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          {item.icon}
          {!isCollapsed && (
            <span className="text-sm font-medium">{item.label}</span>
          )}
        </div>
        {!isCollapsed && item.badge && (
          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-booktarr-accent rounded-full">
            {item.badge}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <div className={`booktarr-sidebar flex flex-col h-full ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-booktarr-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-booktarr-accent rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-booktarr-text">Booktarr</h1>
          </div>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-booktarr-hover transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-4 h-4 text-booktarr-textSecondary transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1">
        {/* Main Navigation */}
        <div className="px-3 space-y-1">
          {navigationItems.map(renderNavItem)}
        </div>

        {/* Separator */}
        <div className="my-4 mx-3 border-t border-booktarr-border"></div>

        {/* System Navigation */}
        <div className="px-3 space-y-1">
          {systemItems.map(renderNavItem)}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-booktarr-border">
        {!isCollapsed && (
          <div className="text-xs text-booktarr-textMuted">
            <div className="flex items-center justify-between">
              <span>v1.0.0</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-booktarr-success rounded-full"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarNavigation;