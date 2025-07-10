/**
 * Main layout component with sidebar navigation and content area
 */
import React, { useState } from 'react';
import SidebarNavigation from './SidebarNavigation';
import FilterPanel from './FilterPanel';
import { Book } from '../types';

type CurrentPage = 'library' | 'settings' | 'series' | 'authors' | 'wanted' | 'activity' | 'logs' | 'enhancement' | 'add';

interface MainLayoutProps {
  currentPage: CurrentPage;
  onPageChange: (page: CurrentPage) => void;
  children: React.ReactNode;
  books?: Book[];
  onFilterChange?: (filteredBooks: Book[]) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  currentPage,
  onPageChange,
  children,
  books = [],
  onFilterChange
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleToggleFilter = () => {
    setFilterVisible(!filterVisible);
  };

  return (
    <div className="flex h-screen bg-booktarr-bg">
      {/* Sidebar */}
      <SidebarNavigation
        currentPage={currentPage}
        onPageChange={onPageChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header className="bg-booktarr-surface border-b border-booktarr-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-booktarr-text capitalize">
                {currentPage}
              </h1>
              
              {/* Page-specific actions */}
              {currentPage === 'library' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleToggleFilter}
                    className="booktarr-btn booktarr-btn-ghost"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                    </svg>
                    Filters
                  </button>
                  
                  <div className="flex items-center space-x-1 bg-booktarr-surface2 rounded-lg p-1">
                    <button className="booktarr-btn booktarr-btn-ghost px-3 py-1 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                    <button className="booktarr-btn booktarr-btn-ghost px-3 py-1 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Global actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search books..."
                  className="booktarr-form-input w-64 pl-10"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Add button */}
              <button 
                onClick={() => onPageChange('add')}
                className="booktarr-btn booktarr-btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Book
              </button>
            </div>
          </div>
        </header>

        {/* Content wrapper */}
        <div className="flex-1 flex overflow-hidden">
          {/* Filter panel */}
          {currentPage === 'library' && books.length > 0 && (
            <FilterPanel
              books={books}
              onFilterChange={onFilterChange || (() => {})}
              isVisible={filterVisible}
              onToggleVisibility={handleToggleFilter}
            />
          )}

          {/* Main content */}
          <main className={`flex-1 overflow-auto p-6 ${filterVisible ? 'ml-80' : ''} transition-all duration-300`}>
            {children}
          </main>
        </div>

        {/* Status bar */}
        <footer className="bg-booktarr-surface border-t border-booktarr-border px-6 py-2">
          <div className="flex items-center justify-between text-sm text-booktarr-textSecondary">
            <div className="flex items-center space-x-4">
              <span>{books.length} books total</span>
              <span className="text-booktarr-textMuted">•</span>
              <span>Last updated: just now</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-booktarr-success rounded-full"></div>
                <span>Connected</span>
              </div>
              <span className="text-booktarr-textMuted">v1.0.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;