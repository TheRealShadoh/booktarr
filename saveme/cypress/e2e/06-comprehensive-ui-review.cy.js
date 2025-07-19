describe('Comprehensive UI Review', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err, runnable) => {
      return false
    })
    cy.visit('/')
  })

  describe('Library Page', () => {
    it('should display library page with all components', () => {
      cy.contains('Your Library').should('be.visible')
      
      // Check for search bar
      cy.get('[data-testid="search-input"]').should('be.visible')
      
      // Check for filter options
      cy.contains('Filters').should('be.visible')
      
      // Check for book display
      cy.waitForLoad()
      
      // Should show series groups
      cy.contains('A Song of Ice and Fire').should('be.visible')
      cy.contains('Harry Potter').should('be.visible')
      cy.contains('Standalone').should('be.visible')
      
      // Should show book count
      cy.contains(/\d+ books across \d+ series/).should('be.visible')
    })

    it('should display book cards with all information', () => {
      cy.waitForLoad()
      
      // Check first book card has all elements
      cy.get('[data-testid="book-card"]').first().within(() => {
        // Check for title
        cy.get('[data-testid="book-title"]').should('be.visible')
        
        // Check for author
        cy.get('[data-testid="book-author"]').should('be.visible')
        
        // Check for series info if applicable
        cy.get('[data-testid="book-series-info"]').should('exist')
        
        // Check for page count
        cy.contains(/\d+ pages/).should('be.visible')
        
        // Check for reading status badge
        cy.get('[data-testid="reading-status"]').should('be.visible')
      })
    })

    it('should have working view toggle', () => {
      cy.waitForLoad()
      
      // Check for view toggle buttons
      cy.get('[data-testid="view-grid"]').should('be.visible')
      cy.get('[data-testid="view-list"]').should('be.visible')
      
      // Toggle to list view
      cy.get('[data-testid="view-list"]').click()
      cy.get('[data-testid="book-list-item"]').should('exist')
      
      // Toggle back to grid view
      cy.get('[data-testid="view-grid"]').click()
      cy.get('[data-testid="book-card"]').should('exist')
    })
  })

  describe('Series Page', () => {
    it('should display series organization', () => {
      cy.navigateTo('Series')
      cy.contains('Series').should('be.visible')
      cy.waitForLoad()
      
      // Check for series groups
      cy.contains('A Song of Ice and Fire').should('be.visible')
      cy.contains('Harry Potter').should('be.visible')
      
      // Check for book count per series
      cy.contains(/\(\d+ books?\)/).should('be.visible')
    })
  })

  describe('Authors Page', () => {
    it('should display authors organization', () => {
      cy.navigateTo('Authors')
      cy.contains('Authors').should('be.visible')
      cy.waitForLoad()
      
      // Check for author names
      cy.contains('George R. R. Martin').should('be.visible')
      cy.contains('J.K. Rowling').should('be.visible')
      
      // Check for book count per author
      cy.contains(/\(\d+ books?\)/).should('be.visible')
    })
  })

  describe('Add Books Page', () => {
    it('should display book search functionality', () => {
      cy.navigateTo('Add')
      cy.contains('Add Books').should('be.visible')
      
      // Check for search input
      cy.get('[data-testid="book-search-input"]').should('be.visible')
      cy.get('[data-testid="book-search-button"]').should('be.visible')
      
      // Check for recent searches if any
      cy.contains('Recent Searches').should('be.visible')
    })

    it('should handle book search', () => {
      cy.navigateTo('Add')
      
      // Search for a book
      cy.get('[data-testid="book-search-input"]').type('Harry Potter')
      cy.get('[data-testid="book-search-button"]').click()
      
      // Wait for results
      cy.get('[data-testid="search-results"]', { timeout: 10000 }).should('be.visible')
      
      // Check for book results
      cy.get('[data-testid="search-result-item"]').should('have.length.greaterThan', 0)
    })
  })

  describe('Settings Page', () => {
    it('should display all settings sections', () => {
      cy.navigateTo('Settings')
      cy.contains('Settings').should('be.visible')
      
      // Check for Skoolib configuration
      cy.contains('Skoolib Configuration').should('be.visible')
      cy.get('[data-testid="skoolib-url-input"]').should('be.visible')
      
      // Check for API Keys section
      cy.contains('API Keys').should('be.visible')
      
      // Check for cache settings
      cy.contains('Cache Settings').should('be.visible')
      
      // Check for sync button
      cy.contains('Sync from Skoolib').should('be.visible')
    })

    it('should display cache statistics', () => {
      cy.navigateTo('Settings')
      
      // Check for cache stats
      cy.contains('Cache Statistics').should('be.visible')
      cy.contains('Total cached items').should('be.visible')
      cy.contains('Cache hit rate').should('be.visible')
    })
  })

  describe('Statistics Dashboard', () => {
    it('should display reading statistics', () => {
      cy.navigateTo('Stats')
      cy.contains(/Stats|Statistics|Dashboard/).should('be.visible')
      
      // Check for stat cards
      cy.contains('Total Books').should('be.visible')
      cy.contains('Books Read').should('be.visible')
      cy.contains('Currently Reading').should('be.visible')
      cy.contains('Wishlist').should('be.visible')
      
      // Check for reading progress if any
      cy.contains(/Reading Progress|Reading Status/).should('be.visible')
    })
  })

  describe('Backup/Restore Page', () => {
    it('should display backup and restore options', () => {
      cy.navigateTo('Backup')
      cy.contains(/Backup|Export/).should('be.visible')
      
      // Check for export options
      cy.contains('Export Library').should('be.visible')
      cy.get('[data-testid="export-csv"]').should('be.visible')
      cy.get('[data-testid="export-json"]').should('be.visible')
      
      // Check for import options
      cy.contains('Import Library').should('be.visible')
      cy.get('[data-testid="import-file-input"]').should('exist')
    })
  })

  describe('Navigation and Layout', () => {
    it('should have working sidebar navigation', () => {
      // Check all navigation links
      const pages = ['Library', 'Series', 'Authors', 'Add', 'Settings', 'Stats', 'Backup']
      
      pages.forEach(page => {
        cy.get('nav').contains(page).should('be.visible').click()
        cy.url().should('include', page.toLowerCase())
      })
    })

    it('should display header with search', () => {
      cy.get('header').within(() => {
        cy.contains('📚 Booktarr').should('be.visible')
        cy.get('[data-testid="global-search"]').should('be.visible')
      })
    })

    it('should have responsive layout', () => {
      // Test mobile view
      cy.viewport('iphone-x')
      cy.get('[data-testid="mobile-menu-toggle"]').should('be.visible')
      
      // Test tablet view
      cy.viewport('ipad-2')
      cy.get('nav').should('be.visible')
      
      // Test desktop view
      cy.viewport(1280, 720)
      cy.get('nav').should('be.visible')
    })
  })

  describe('PWA Features', () => {
    it('should show offline indicator when offline', () => {
      // Simulate offline
      cy.window().then(win => {
        cy.stub(win.navigator, 'onLine').value(false)
        win.dispatchEvent(new Event('offline'))
      })
      
      cy.get('[data-testid="offline-indicator"]').should('be.visible')
    })

    it('should show PWA install prompt if applicable', () => {
      // Check if PWA install prompt exists (may not show if already installed)
      cy.get('body').then($body => {
        if ($body.find('[data-testid="pwa-install-prompt"]').length) {
          cy.get('[data-testid="pwa-install-prompt"]').should('be.visible')
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      // Intercept API call and return error
      cy.intercept('GET', '/api/books', {
        statusCode: 500,
        body: { detail: 'Internal Server Error' }
      })
      
      cy.visit('/')
      cy.get('[data-testid="error-message"]').should('be.visible')
      cy.contains('Failed to load books').should('be.visible')
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner during data fetch', () => {
      // Intercept API call with delay
      cy.intercept('GET', '/api/books', (req) => {
        req.reply((res) => {
          res.delay(1000)
          res.send({ fixture: 'books.json' })
        })
      })
      
      cy.visit('/')
      cy.get('[data-testid="loading-spinner"]').should('be.visible')
      cy.get('[data-testid="loading-spinner"]').should('not.exist')
    })
  })
})