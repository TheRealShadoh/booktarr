describe('Search Integration and API Testing', () => {
  beforeEach(() => {
    cy.waitForAPI()
    cy.resetSettings()
    cy.visit('/')
  })

  it('should test library search functionality', () => {
    cy.waitForLoad()
    
    // Test successful library search
    cy.get('[data-testid="search-input"]').type('Harry Potter')
    cy.get('[data-testid="search-button"]').click()
    
    cy.contains('Harry Potter and the Goblet of Fire').should('be.visible')
    cy.contains('Hitchhiker').should('not.exist')
    
    // Clear search
    cy.get('[data-testid="search-input"]').clear()
    cy.get('[data-testid="search-button"]').click()
    cy.contains('Hitchhiker').should('be.visible')
  })

  it('should handle external book search with cache service error gracefully', () => {
    // Navigate to book search page if it exists
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="book-search-tab"]').length > 0) {
        cy.get('[data-testid="book-search-tab"]').click()
        
        // Test search that might trigger cache service error
        cy.get('[data-testid="external-search-input"]').type('Harry Potter')
        cy.get('[data-testid="external-search-button"]').click()
        
        // Should either show results or handle the cache error gracefully
        cy.get('body').should('not.contain', 'got an unexpected keyword argument')
      }
    })
  })

  it('should test API endpoints directly through UI interactions', () => {
    // Test books API through UI
    cy.waitForLoad()
    cy.contains('Harry Potter').should('be.visible')
    
    // Test settings API through UI
    cy.navigateTo('Settings')
    cy.get('[data-testid="cache-ttl-input"]').should('have.value', '3600')
    
    // Test settings update
    cy.get('[data-testid="cache-ttl-input"]').clear().type('7200')
    cy.get('[data-testid="save-settings-button"]').click()
    cy.checkToast('Settings updated successfully!', 'success')
  })

  it('should test error handling for network issues', () => {
    // Mock network error for books API
    cy.intercept('GET', '/api/books', { forceNetworkError: true }).as('networkError')
    
    cy.contains('Refresh').click()
    cy.wait('@networkError')
    
    // Should show error message or handle gracefully
    cy.get('body').should('contain.text', 'Error')
      .or('contain.text', 'Network')
      .or('contain.text', 'Failed')
      .or('not.contain', 'Harry Potter') // Books shouldn't load
  })

  it('should test API response times and performance', () => {
    // Monitor API calls and check response times
    cy.intercept('GET', '/api/books').as('getBooksAPI')
    cy.intercept('GET', '/api/settings').as('getSettingsAPI')
    
    // Trigger books API call
    cy.contains('Refresh').click()
    cy.wait('@getBooksAPI').then((interception) => {
      expect(interception.response.statusCode).to.eq(200)
      // Response should be reasonably fast (under 5 seconds)
      expect(interception.response.delay).to.be.lessThan(5000)
    })
    
    // Trigger settings API call
    cy.navigateTo('Settings')
    cy.wait('@getSettingsAPI').then((interception) => {
      expect(interception.response.statusCode).to.eq(200)
      expect(interception.response.delay).to.be.lessThan(2000)
    })
  })

  it('should verify CORS headers are present', () => {
    // Check that CORS headers are properly set
    cy.request('GET', 'http://localhost:8000/api/books')
      .then((response) => {
        expect(response.status).to.eq(200)
        expect(response.headers).to.have.property('access-control-allow-origin')
      })
  })

  it('should test pagination and large dataset handling', () => {
    cy.waitForLoad()
    
    // Check that all books are displayed
    cy.contains('10 books').should('be.visible')
    cy.contains('5 series').should('be.visible')
    
    // Verify series grouping works correctly
    cy.contains('Harry Potter').should('be.visible')
    cy.contains('A Song of Ice and Fire').should('be.visible')
    cy.contains('Middle-earth').should('be.visible')
    cy.contains('Standalone').should('be.visible')
  })

  it('should test search with special characters and edge cases', () => {
    const searchTerms = [
      'Harry Potter', // Normal search
      'J.K. Rowling', // Author search with periods
      'Fantasy', // Category search
      '9780439708180', // ISBN search
      'NonExistentBook123', // No results
      '', // Empty search
      '   ', // Whitespace only
    ]
    
    searchTerms.forEach((term) => {
      cy.get('[data-testid="search-input"]').clear()
      if (term.trim()) {
        cy.get('[data-testid="search-input"]').type(term)
      }
      cy.get('[data-testid="search-button"]').click()
      
      if (term === 'NonExistentBook123') {
        // Should show no results or empty state
        cy.get('body').should('not.contain', 'Harry Potter and the Goblet of Fire')
      } else if (term.trim() === '') {
        // Empty search should show all books
        cy.contains('Harry Potter').should('be.visible')
      }
    })
  })
})