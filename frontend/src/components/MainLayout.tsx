/**
 * Main layout component with sidebar navigation and content area
 * Enhanced with mobile responsiveness and touch gestures
 */
import React, { useState, useRef } from 'react';
import SidebarNavigation from './SidebarNavigation';
import FilterPanel from './FilterPanel';
import BookSearch from './BookSearch';
import { Book } from '../types';
import { CurrentPage } from '../context/AppContext';
import { useResponsive } from '../hooks/useResponsive';
import { useTouchGestures } from '../hooks/useTouchGestures';

interface MainLayoutProps {
  currentPage: CurrentPage;
  onPageChange: (page: CurrentPage) => void;
  children: React.ReactNode;
  books?: Book[];
  onFilterChange?: (filteredBooks: Book[]) => void;
  onBookSelect?: (book: Book) => void;
  onSearchAddBook?: (searchQuery: string) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  currentPage,
  onPageChange,
  children,
  books = [],
  onFilterChange,
  onBookSelect,
  onSearchAddBook
}) => {
  const { device, breakpoints, getResponsiveValue } = useResponsive();
  const mainRef = useRef<HTMLDivElement>(null);
  
  // Responsive state management
  const [sidebarCollapsed, setSidebarCollapsed] = useState(device.isMobile);
  const [filterVisible, setFilterVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (device.isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleToggleFilter = () => {
    setFilterVisible(!filterVisible);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  // Touch gestures for mobile navigation
  useTouchGestures(mainRef, {
    onSwipe: (gesture) => {
      if (device.isMobile && Math.abs(gesture.direction === 'right' ? gesture.distance : -gesture.distance) > 100) {
        if (gesture.direction === 'right' && !mobileMenuOpen) {
          setMobileMenuOpen(true);
        } else if (gesture.direction === 'left' && mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }
    }
  });

  const sidebarWidth = getResponsiveValue({
    mobile: mobileMenuOpen ? 'w-64' : 'w-0',
    tablet: sidebarCollapsed ? 'w-16' : 'w-64',
    desktop: sidebarCollapsed ? 'w-16' : 'w-64',
    default: 'w-64'
  });

  return (
    <div ref={mainRef} className="flex h-screen bg-booktarr-bg">
      {/* Mobile Menu Overlay */}
      {device.isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleMobileMenuClose}
        />
      )}

      {/* Sidebar */}
      <div className={`${device.isMobile ? 'fixed' : 'relative'} ${sidebarWidth} transition-all duration-300 ease-in-out z-50`}>
        {(device.isMobile ? mobileMenuOpen : true) && (
          <SidebarNavigation
            currentPage={currentPage}
            onPageChange={(page) => {
              onPageChange(page);
              if (device.isMobile) {
                handleMobileMenuClose();
              }
            }}
            isCollapsed={device.isMobile ? false : sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden"
           style={{ marginLeft: device.isMobile ? 0 : undefined }}>
        {/* Header bar */}
        <header className="bg-booktarr-surface border-b border-booktarr-border px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile Menu Button */}
              {device.isMobile && (
                <button
                  onClick={handleToggleSidebar}
                  className="p-2 rounded-lg hover:bg-booktarr-hover transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg className="w-5 h-5 text-booktarr-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              
              <h1 className="text-lg sm:text-xl font-semibold text-booktarr-text capitalize">
                {currentPage}
              </h1>
              
              {/* Page-specific actions */}
              {currentPage === 'library' && !device.isMobile && (
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
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Search - Hidden on mobile, shown in a separate search page */}
              {!device.isMobile && onBookSelect && onSearchAddBook && (
                <BookSearch
                  onBookSelect={onBookSelect}
                  onAddNewBook={onSearchAddBook}
                  className="w-48 lg:w-64"
                />
              )}

              {/* Mobile Search Button */}
              {device.isMobile && (
                <button 
                  onClick={() => onPageChange('library')}
                  className="p-2 rounded-lg hover:bg-booktarr-hover transition-colors"
                  aria-label="Search"
                >
                  <svg className="w-5 h-5 text-booktarr-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}

              {/* Add button */}
              <button 
                onClick={() => onPageChange('add')}
                className={getResponsiveValue({
                  mobile: "p-2 rounded-lg bg-booktarr-accent text-white hover:bg-booktarr-accentHover transition-colors",
                  default: "booktarr-btn booktarr-btn-primary"
                })}
                aria-label={device.isMobile ? "Add book" : undefined}
              >
                <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {!device.isMobile && <span>Add Book</span>}
              </button>

              {/* Mobile Filter Button */}
              {device.isMobile && currentPage === 'library' && (
                <button 
                  onClick={handleToggleFilter}
                  className="p-2 rounded-lg hover:bg-booktarr-hover transition-colors"
                  aria-label="Filters"
                >
                  <svg className="w-5 h-5 text-booktarr-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Content wrapper */}
        <div className="flex-1 flex overflow-hidden">
          {/* Filter panel - Hidden on mobile when closed */}
          {currentPage === 'library' && books.length > 0 && (
            <FilterPanel
              books={books}
              onFilterChange={onFilterChange || (() => {})}
              isVisible={filterVisible}
              onToggleVisibility={handleToggleFilter}
            />
          )}

          {/* Main content */}
          <main className={`flex-1 overflow-auto p-4 sm:p-6 ${
            filterVisible && !device.isMobile ? 'ml-80' : ''
          } transition-all duration-300`}>
            {children}
          </main>
        </div>

        {/* Status bar - Hidden on mobile */}
        {!device.isMobile && (
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
        )}
      </div>
    </div>
  );
};

export default MainLayout;