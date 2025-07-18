import React, { useState } from 'react';
import SidebarNavigation from './SidebarNavigation';
import SearchBar from './SearchBar';
import { Book } from '../types';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  books: Book[];
  onFilterChange: (filteredBooks: Book[]) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentPage,
  onPageChange,
  books,
  onFilterChange
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      onFilterChange(books);
      return;
    }

    const filtered = books.filter(book => 
      book.title.toLowerCase().includes(query.toLowerCase()) ||
      book.authors.some(author => author.toLowerCase().includes(query.toLowerCase())) ||
      (book.series && book.series.toLowerCase().includes(query.toLowerCase())) ||
      (book.isbn && book.isbn.includes(query)) ||
      (book.isbn13 && book.isbn13.includes(query))
    );
    
    onFilterChange(filtered);
  };

  const handleSearchSubmit = (query: string) => {
    handleSearch(query);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'library':
        return 'Library';
      case 'search':
        return 'Add Books';
      case 'series':
        return 'Series';
      case 'authors':
        return 'Authors';
      case 'wanted':
        return 'Wanted';
      case 'collections':
        return 'Collections';
      case 'advanced-search':
        return 'Advanced Search';
      case 'analytics':
        return 'Analytics';
      case 'settings':
        return 'Settings';
      default:
        return 'Booktarr';
    }
  };

  return (
    <div className="flex h-screen bg-booktarr-bg">
      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto
        ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarNavigation
          currentPage={currentPage}
          onPageChange={(page) => {
            onPageChange(page);
            setShowMobileMenu(false);
          }}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-booktarr-surface border-b border-booktarr-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="booktarr-btn booktarr-btn-ghost p-2 md:hidden"
              title="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Page Title */}
            <h1 className="text-xl font-semibold text-booktarr-text">
              {getPageTitle()}
            </h1>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="hidden md:block">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearchSubmit}
                placeholder="Search books..."
                showFilters={false}
              />
            </div>

            {/* Theme Toggle */}
            <button
              className="booktarr-btn booktarr-btn-ghost p-2"
              title="Toggle theme"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>

            {/* Notifications */}
            <button
              className="booktarr-btn booktarr-btn-ghost p-2 relative"
              title="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 bg-booktarr-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                2
              </span>
            </button>
          </div>
        </header>

        {/* Mobile Search */}
        <div className="md:hidden p-4 border-b border-booktarr-border">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearchSubmit}
            placeholder="Search books..."
            showFilters={false}
          />
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;