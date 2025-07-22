describe('Comprehensive UI Test Suite with Screenshots', () => {
  before(() => {
    // Ensure API is ready before running tests
    cy.waitForAPI();
  });

  beforeEach(() => {
    // Handle uncaught exceptions
    cy.on('uncaught:exception', (err, runnable) => {
      // Don't fail tests on uncaught exceptions
      return false;
    });
    
    // Visit the app
    cy.visit('/');
    cy.waitForPageLoad();
  });

  describe('App Initialization and Basic Functionality', () => {
    it('should load the application successfully', () => {
      cy.takeScreenshot('app_initialization', 'Application loaded successfully');
      cy.title().should('contain', 'Booktarr');
      cy.get('body').should('be.visible');
    });

    it('should display the main layout components', () => {
      // Test sidebar visibility
      cy.get('.booktarr-sidebar').should('be.visible');
      cy.takeScreenshot('main_layout_sidebar', 'Sidebar component visible');
      
      // Test main content area
      cy.get('.booktarr-main-content').should('be.visible');
      cy.takeScreenshot('main_layout_content', 'Main content area visible');
      
      // Test header/navigation
      cy.get('nav').should('be.visible');
      cy.takeScreenshot('main_layout_navigation', 'Navigation component visible');
    });
  });

  describe('Complete Sidebar Navigation Testing', () => {
    it('should test all sidebar navigation items', () => {
      const sidebarItems = [
        { id: 'library', label: 'Library' },
        { id: 'series', label: 'Series' },
        { id: 'authors', label: 'Authors' },
        { id: 'enhancement', label: 'Enhancement' },
        { id: 'wanted', label: 'Wanted' },
        { id: 'import', label: 'Import' },
        { id: 'amazon-sync', label: 'Amazon Sync' },
        { id: 'collections', label: 'Collections' },
        { id: 'advanced-search', label: 'Advanced Search' },
        { id: 'recommendations', label: 'Recommendations' },
        { id: 'challenges', label: 'Challenges' },
        { id: 'share', label: 'Share & Export' },
        { id: 'activity', label: 'Reading Timeline' },
        { id: 'settings', label: 'Settings' },
        { id: 'stats', label: 'Statistics' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'bulk-edit', label: 'Bulk Edit' },
        { id: 'backup', label: 'Backup' },
        { id: 'logs', label: 'System' }
      ];

      sidebarItems.forEach(item => {
        cy.log(`Testing navigation to ${item.label}`);
        
        // Click on the sidebar item
        cy.get('.booktarr-sidebar-item').contains(item.label).click();
        cy.waitForPageLoad();
        
        // Take screenshot of the page
        const screenshotName = `sidebar_${item.id.replace(/-/g, '_')}`;
        cy.takeScreenshot(screenshotName, `${item.label} page loaded`);
        
        // Verify the page loaded correctly
        cy.url().should('include', item.id);
        
        // Test page-specific content
        cy.get('h1, h2, h3').should('be.visible');
      });
    });
  });

  describe('Library Page Comprehensive Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Library');
      cy.waitForPageLoad();
    });

    it('should test all library page components', () => {
      cy.takeScreenshot('library_page_initial', 'Library page initial state');
      
      // Test search functionality
      cy.get('[data-testid="search-input"]').should('be.visible');
      cy.get('[data-testid="search-input"]').type('Harry Potter');
      cy.takeScreenshot('library_search_typed', 'Search text entered');
      
      // Test filter buttons
      cy.get('button').contains('All').click();
      cy.takeScreenshot('library_filter_all', 'All filter selected');
      
      cy.get('button').contains('Unread').click();
      cy.takeScreenshot('library_filter_unread', 'Unread filter selected');
      
      cy.get('button').contains('Reading').click();
      cy.takeScreenshot('library_filter_reading', 'Reading filter selected');
      
      cy.get('button').contains('Read').click();
      cy.takeScreenshot('library_filter_read', 'Read filter selected');
      
      // Test view toggles
      cy.get('button').contains('Expand All').click();
      cy.takeScreenshot('library_expanded_all', 'All series expanded');
      
      cy.get('button').contains('Collapse All').click();
      cy.takeScreenshot('library_collapsed_all', 'All series collapsed');
      
      // Test book cards
      cy.get('.booktarr-book-card').first().click();
      cy.takeScreenshot('library_book_card_clicked', 'Book card clicked');
    });

    it('should test book interaction features', () => {
      // Test book card hover states
      cy.get('.booktarr-book-card').first().trigger('mouseover');
      cy.takeScreenshot('library_book_hover', 'Book card hover state');
      
      // Test reading status dropdown
      cy.get('.booktarr-book-card').first().within(() => {
        cy.get('[data-testid="reading-status-dropdown"]').click();
        cy.takeScreenshot('library_status_dropdown', 'Reading status dropdown opened');
      });
      
      // Test star rating
      cy.get('.star-rating').first().click();
      cy.takeScreenshot('library_star_rating', 'Star rating interaction');
    });
  });

  describe('Series Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Series');
      cy.waitForPageLoad();
    });

    it('should test series page functionality', () => {
      cy.takeScreenshot('series_page_initial', 'Series page initial state');
      
      // Test series grid
      cy.get('.booktarr-series-section').should('be.visible');
      
      // Test series header clicks
      cy.get('.booktarr-series-header').first().click();
      cy.takeScreenshot('series_header_clicked', 'Series header clicked');
      
      // Test series book grid
      cy.get('.booktarr-book-grid').should('be.visible');
      cy.takeScreenshot('series_books_visible', 'Series books displayed');
    });
  });

  describe('Authors Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Authors');
      cy.waitForPageLoad();
    });

    it('should test authors page functionality', () => {
      cy.takeScreenshot('authors_page_initial', 'Authors page initial state');
      
      // Test author cards
      cy.get('.author-card').first().click();
      cy.takeScreenshot('authors_card_clicked', 'Author card clicked');
      
      // Test author book listings
      cy.get('.booktarr-book-grid').should('be.visible');
      cy.takeScreenshot('authors_books_visible', 'Author books displayed');
    });
  });

  describe('Enhancement Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Enhancement');
      cy.waitForPageLoad();
    });

    it('should test enhancement page functionality', () => {
      cy.takeScreenshot('enhancement_page_initial', 'Enhancement page initial state');
      
      // Test enhancement buttons
      cy.get('button').contains('Enhance All').click();
      cy.takeScreenshot('enhancement_all_clicked', 'Enhance All button clicked');
      
      // Test individual enhancement
      cy.get('button').contains('Enhance Selected').click();
      cy.takeScreenshot('enhancement_selected_clicked', 'Enhance Selected button clicked');
      
      // Test cache stats
      cy.get('.cache-stats').should('be.visible');
      cy.takeScreenshot('enhancement_cache_stats', 'Cache stats displayed');
    });
  });

  describe('Settings Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Settings');
      cy.waitForPageLoad();
    });

    it('should test settings page functionality', () => {
      cy.takeScreenshot('settings_page_initial', 'Settings page initial state');
      
      // Test settings sections
      cy.get('.settings-section').should('be.visible');
      
      // Test form inputs
      cy.get('input[type="text"]').first().clear().type('test value');
      cy.takeScreenshot('settings_input_changed', 'Settings input changed');
      
      // Test checkboxes
      cy.get('input[type="checkbox"]').first().click();
      cy.takeScreenshot('settings_checkbox_toggled', 'Settings checkbox toggled');
      
      // Test save button
      cy.get('button').contains('Save').click();
      cy.takeScreenshot('settings_save_clicked', 'Settings save button clicked');
    });
  });

  describe('Import Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Import');
      cy.waitForPageLoad();
    });

    it('should test import page functionality', () => {
      cy.takeScreenshot('import_page_initial', 'Import page initial state');
      
      // Test import buttons
      cy.get('button').contains('Import from CSV').click();
      cy.takeScreenshot('import_csv_clicked', 'Import CSV button clicked');
      
      cy.get('button').contains('Import from JSON').click();
      cy.takeScreenshot('import_json_clicked', 'Import JSON button clicked');
      
      // Test file upload
      cy.get('input[type="file"]').should('be.visible');
      cy.takeScreenshot('import_file_input', 'File input visible');
    });
  });

  describe('Amazon Sync Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Amazon Sync');
      cy.waitForPageLoad();
    });

    it('should test Amazon sync page functionality', () => {
      cy.takeScreenshot('amazon_sync_initial', 'Amazon Sync page initial state');
      
      // Test authentication section
      cy.get('.auth-section').should('be.visible');
      
      // Test sync buttons
      cy.get('button').contains('Sync Audible').click();
      cy.takeScreenshot('amazon_audible_sync_clicked', 'Audible sync button clicked');
      
      cy.get('button').contains('Sync Kindle').click();
      cy.takeScreenshot('amazon_kindle_sync_clicked', 'Kindle sync button clicked');
      
      // Test sync history
      cy.get('.sync-history').should('be.visible');
      cy.takeScreenshot('amazon_sync_history', 'Sync history displayed');
    });
  });

  describe('Collections Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Collections');
      cy.waitForPageLoad();
    });

    it('should test collections page functionality', () => {
      cy.takeScreenshot('collections_page_initial', 'Collections page initial state');
      
      // Test create collection button
      cy.get('button').contains('Create Collection').click();
      cy.takeScreenshot('collections_create_clicked', 'Create Collection button clicked');
      
      // Test collection management
      cy.get('.collection-card').first().click();
      cy.takeScreenshot('collections_card_clicked', 'Collection card clicked');
    });
  });

  describe('Advanced Search Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Advanced Search');
      cy.waitForPageLoad();
    });

    it('should test advanced search functionality', () => {
      cy.takeScreenshot('advanced_search_initial', 'Advanced Search page initial state');
      
      // Test search filters
      cy.get('.filter-section').should('be.visible');
      
      // Test search execution
      cy.get('button').contains('Search').click();
      cy.takeScreenshot('advanced_search_executed', 'Advanced search executed');
      
      // Test filter toggles
      cy.get('.filter-toggle').first().click();
      cy.takeScreenshot('advanced_search_filter_toggled', 'Search filter toggled');
    });
  });

  describe('Recommendations Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Recommendations');
      cy.waitForPageLoad();
    });

    it('should test recommendations functionality', () => {
      cy.takeScreenshot('recommendations_initial', 'Recommendations page initial state');
      
      // Test recommendation cards
      cy.get('.recommendation-card').first().click();
      cy.takeScreenshot('recommendations_card_clicked', 'Recommendation card clicked');
      
      // Test recommendation actions
      cy.get('button').contains('Add to Library').click();
      cy.takeScreenshot('recommendations_add_clicked', 'Add to Library button clicked');
    });
  });

  describe('Challenges Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Challenges');
      cy.waitForPageLoad();
    });

    it('should test challenges functionality', () => {
      cy.takeScreenshot('challenges_initial', 'Challenges page initial state');
      
      // Test challenge cards
      cy.get('.challenge-card').first().click();
      cy.takeScreenshot('challenges_card_clicked', 'Challenge card clicked');
      
      // Test create challenge
      cy.get('button').contains('Create Challenge').click();
      cy.takeScreenshot('challenges_create_clicked', 'Create Challenge button clicked');
    });
  });

  describe('Share & Export Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Share & Export');
      cy.waitForPageLoad();
    });

    it('should test share and export functionality', () => {
      cy.takeScreenshot('share_export_initial', 'Share & Export page initial state');
      
      // Test export buttons
      cy.get('button').contains('Export to CSV').click();
      cy.takeScreenshot('share_export_csv_clicked', 'Export to CSV button clicked');
      
      cy.get('button').contains('Export to JSON').click();
      cy.takeScreenshot('share_export_json_clicked', 'Export to JSON button clicked');
      
      // Test sharing options
      cy.get('.sharing-options').should('be.visible');
      cy.takeScreenshot('share_options_visible', 'Sharing options displayed');
    });
  });

  describe('Reading Timeline Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Reading Timeline');
      cy.waitForPageLoad();
    });

    it('should test reading timeline functionality', () => {
      cy.takeScreenshot('reading_timeline_initial', 'Reading Timeline page initial state');
      
      // Test timeline navigation
      cy.get('.timeline-navigation').should('be.visible');
      
      // Test timeline entries
      cy.get('.timeline-entry').first().click();
      cy.takeScreenshot('reading_timeline_entry_clicked', 'Timeline entry clicked');
    });
  });

  describe('Statistics Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Statistics');
      cy.waitForPageLoad();
    });

    it('should test statistics page functionality', () => {
      cy.takeScreenshot('statistics_initial', 'Statistics page initial state');
      
      // Test statistics charts
      cy.get('.stats-chart').should('be.visible');
      cy.takeScreenshot('statistics_charts_visible', 'Statistics charts displayed');
      
      // Test statistics filters
      cy.get('.stats-filter').first().click();
      cy.takeScreenshot('statistics_filter_clicked', 'Statistics filter clicked');
    });
  });

  describe('Analytics Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Analytics');
      cy.waitForPageLoad();
    });

    it('should test analytics page functionality', () => {
      cy.takeScreenshot('analytics_initial', 'Analytics page initial state');
      
      // Test analytics sections
      cy.get('.analytics-section').should('be.visible');
      
      // Test analytics controls
      cy.get('button').contains('Refresh Data').click();
      cy.takeScreenshot('analytics_refresh_clicked', 'Refresh Data button clicked');
    });
  });

  describe('Bulk Edit Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Bulk Edit');
      cy.waitForPageLoad();
    });

    it('should test bulk edit functionality', () => {
      cy.takeScreenshot('bulk_edit_initial', 'Bulk Edit page initial state');
      
      // Test selection
      cy.get('input[type="checkbox"]').first().click();
      cy.takeScreenshot('bulk_edit_selection', 'Book selected for bulk edit');
      
      // Test bulk actions
      cy.get('button').contains('Apply Changes').click();
      cy.takeScreenshot('bulk_edit_apply_clicked', 'Apply Changes button clicked');
    });
  });

  describe('Backup Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('Backup');
      cy.waitForPageLoad();
    });

    it('should test backup functionality', () => {
      cy.takeScreenshot('backup_initial', 'Backup page initial state');
      
      // Test backup creation
      cy.get('button').contains('Create Backup').click();
      cy.takeScreenshot('backup_create_clicked', 'Create Backup button clicked');
      
      // Test backup restoration
      cy.get('button').contains('Restore Backup').click();
      cy.takeScreenshot('backup_restore_clicked', 'Restore Backup button clicked');
    });
  });

  describe('System Page Testing', () => {
    beforeEach(() => {
      cy.navigateTo('System');
      cy.waitForPageLoad();
    });

    it('should test system page functionality', () => {
      cy.takeScreenshot('system_initial', 'System page initial state');
      
      // Test system information
      cy.get('.system-info').should('be.visible');
      cy.takeScreenshot('system_info_visible', 'System information displayed');
      
      // Test system logs
      cy.get('.system-logs').should('be.visible');
      cy.takeScreenshot('system_logs_visible', 'System logs displayed');
    });
  });

  describe('Responsive Design Testing', () => {
    it('should test mobile viewport', () => {
      cy.viewport(375, 667); // iPhone SE
      cy.takeScreenshot('mobile_viewport', 'Mobile viewport');
      
      // Test mobile navigation
      cy.get('.mobile-nav-toggle').click();
      cy.takeScreenshot('mobile_nav_open', 'Mobile navigation opened');
    });

    it('should test tablet viewport', () => {
      cy.viewport(768, 1024); // iPad
      cy.takeScreenshot('tablet_viewport', 'Tablet viewport');
      
      // Test tablet layout
      cy.get('.booktarr-book-grid').should('be.visible');
      cy.takeScreenshot('tablet_book_grid', 'Tablet book grid layout');
    });

    it('should test desktop viewport', () => {
      cy.viewport(1920, 1080); // Desktop
      cy.takeScreenshot('desktop_viewport', 'Desktop viewport');
      
      // Test desktop layout
      cy.get('.booktarr-sidebar').should('be.visible');
      cy.takeScreenshot('desktop_full_layout', 'Desktop full layout');
    });
  });

  describe('Error Handling Testing', () => {
    it('should test error states', () => {
      // Test network error handling
      cy.intercept('GET', '/api/books', { statusCode: 500 }).as('serverError');
      cy.navigateTo('Library');
      cy.wait('@serverError');
      cy.takeScreenshot('error_network', 'Network error state');
      
      // Test loading states
      cy.intercept('GET', '/api/books', { delay: 5000 }).as('slowRequest');
      cy.navigateTo('Library');
      cy.takeScreenshot('loading_state', 'Loading state displayed');
    });
  });

  after(() => {
    // Take final screenshot
    cy.takeScreenshot('test_suite_complete', 'All tests completed successfully');
  });
});