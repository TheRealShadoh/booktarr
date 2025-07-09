describe('End-to-End User Flow', () => {
  beforeEach(() => {
    cy.waitForAPI()
    cy.resetSettings()
    cy.visit('/')
  })

  it('should complete full user workflow: Settings → Library → Search', () => {
    // Step 1: Configure settings
    cy.navigateTo('Settings')
    cy.get('[data-testid="cache-ttl-input"]').clear().type('7200')
    cy.get('[data-testid="default-language-select"]').select('fr')
    cy.get('[data-testid="save-settings-button"]').click()
    cy.checkToast('Settings updated successfully!', 'success')

    // Step 2: Navigate to library
    cy.navigateTo('Library')
    cy.waitForLoad()
    cy.contains('Your Library').should('be.visible')
    cy.contains('Harry Potter').should('be.visible')

    // Step 3: Search for books
    cy.get('[data-testid="search-input"]').type('Harry Potter')
    cy.get('[data-testid="search-button"]').click()
    cy.contains('Harry Potter and the Goblet of Fire').should('be.visible')
    cy.contains('Hitchhiker').should('not.exist')

    // Step 4: Clear search and view all books
    cy.get('[data-testid="search-input"]').clear()
    cy.get('[data-testid="search-button"]').click()
    cy.contains('Harry Potter and the Goblet of Fire').should('be.visible')
    cy.contains('Hitchhiker').should('be.visible')

    // Step 5: Interact with series
    cy.contains('Collapse All').click()
    cy.contains('Harry Potter and the Goblet of Fire').should('not.be.visible')
    cy.contains('Expand All').click()
    cy.contains('Harry Potter and the Goblet of Fire').should('be.visible')

    // Step 6: Refresh library
    cy.contains('Refresh').click()
    cy.waitForLoad()
    cy.contains('Harry Potter').should('be.visible')
    cy.contains('3 books across 2 series').should('be.visible')
  })

  it('should handle error states gracefully', () => {
    // Test network error handling
    cy.intercept('GET', '/api/books/test', { forceNetworkError: true }).as('networkError')
    
    cy.contains('Refresh').click()
    cy.wait('@networkError')
    
    cy.contains('Error').should('be.visible')
    cy.contains('Try Again').should('be.visible')
  })

  it('should validate URL and display appropriate feedback', () => {
    cy.navigateTo('Settings')
    
    // Test valid URL
    cy.get('[data-testid="skoolib-url-input"]').type('https://httpbin.org/get')
    cy.get('[data-testid="validate-url-button"]').click()
    cy.contains('Validating...').should('be.visible')
    cy.checkToast('Found 0 books', 'success')
    
    // Test invalid URL format
    cy.get('[data-testid="skoolib-url-input"]').clear().type('not-a-url')
    cy.get('[data-testid="validate-url-button"]').click()
    cy.checkToast('URL must start with http', 'error')
    
    // Test empty URL
    cy.get('[data-testid="skoolib-url-input"]').clear()
    cy.get('[data-testid="validate-url-button"]').click()
    cy.checkToast('Please enter a Skoolib URL first', 'warning')
  })

  it('should maintain settings across page navigation', () => {
    // Configure settings
    cy.navigateTo('Settings')
    cy.get('[data-testid="cache-ttl-input"]').clear().type('7200')
    cy.get('[data-testid="default-language-select"]').select('es')
    cy.get('[data-testid="enable-price-lookup-checkbox"]').uncheck()
    cy.get('[data-testid="save-settings-button"]').click()
    cy.checkToast('Settings updated successfully!', 'success')

    // Navigate away and back
    cy.navigateTo('Library')
    cy.navigateTo('Settings')

    // Verify settings are maintained
    cy.get('[data-testid="cache-ttl-input"]').should('have.value', '7200')
    cy.get('[data-testid="default-language-select"]').should('have.value', 'es')
    cy.get('[data-testid="enable-price-lookup-checkbox"]').should('not.be.checked')
  })

  it('should handle concurrent user actions', () => {
    // Simulate rapid navigation and actions
    cy.navigateTo('Settings')
    cy.navigateTo('Library')
    cy.contains('Refresh').click()
    cy.navigateTo('Settings')
    cy.get('[data-testid="cache-ttl-input"]').clear().type('5400')
    cy.get('[data-testid="save-settings-button"]').click()
    cy.navigateTo('Library')
    
    // Should still work correctly
    cy.waitForLoad()
    cy.contains('Harry Potter').should('be.visible')
  })

  it('should display loading states appropriately', () => {
    // Test loading state during refresh
    cy.contains('Refresh').click()
    cy.get('[data-testid="loading-spinner"]').should('be.visible')
    cy.waitForLoad()
    cy.get('[data-testid="loading-spinner"]').should('not.exist')
    
    // Test loading state during settings update
    cy.navigateTo('Settings')
    cy.get('[data-testid="cache-ttl-input"]').clear().type('3600')
    cy.get('[data-testid="save-settings-button"]').click()
    cy.get('[data-testid="save-settings-button"]').should('contain', 'Saving...')
    cy.checkToast('Settings updated successfully!', 'success')
    cy.get('[data-testid="save-settings-button"]').should('contain', 'Save Settings')
  })
})