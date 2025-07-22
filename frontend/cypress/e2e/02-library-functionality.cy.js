describe('Library Functionality', () => {
  beforeEach(() => {
    cy.waitForAPI()
    cy.resetSettings()
    cy.visit('/')
    cy.waitForLoad()
  })

  it('should display books organized by series', () => {
    cy.contains('Harry Potter').should('be.visible')
    cy.contains('Standalone').should('be.visible')
    cy.contains('books across').should('be.visible')
    cy.contains('series').should('be.visible')
  })

  it('should allow expanding and collapsing series', () => {
    // Find a series group and collapse it
    cy.contains('Harry Potter').parent().parent().within(() => {
      cy.get('[data-testid="series-toggle"]').click()
    })
    
    // Books should be hidden
    cy.contains('Harry Potter and the Goblet of Fire').should('not.be.visible')
    
    // Expand again
    cy.contains('Harry Potter').parent().parent().within(() => {
      cy.get('[data-testid="series-toggle"]').click()
    })
    
    // Books should be visible again
    cy.contains('Harry Potter and the Goblet of Fire').should('be.visible')
  })

  it('should provide expand all and collapse all functionality', () => {
    cy.contains('Collapse All').click()
    cy.contains('Harry Potter and the Goblet of Fire').should('not.be.visible')
    
    cy.contains('Expand All').click()
    cy.contains('Harry Potter and the Goblet of Fire').should('be.visible')
  })

  it('should have working search functionality', () => {
    cy.get('[data-testid="search-input"]').type('Harry Potter')
    cy.get('[data-testid="search-button"]').click()
    
    cy.contains('Harry Potter and the Goblet of Fire').should('be.visible')
    cy.contains('Hitchhiker').should('not.exist')
  })

  it('should clear search results', () => {
    cy.get('[data-testid="search-input"]').type('Harry Potter')
    cy.get('[data-testid="search-button"]').click()
    
    // Clear search
    cy.get('[data-testid="search-input"]').clear()
    cy.get('[data-testid="search-button"]').click()
    
    cy.contains('Harry Potter and the Goblet of Fire').should('be.visible')
    cy.contains('Hitchhiker').should('be.visible')
  })

  it('should display book details correctly', () => {
    cy.contains('Harry Potter and the Goblet of Fire').should('be.visible')
    cy.contains('J.K. Rowling').should('be.visible')
    cy.contains('Harry Potter #4').should('be.visible')
    cy.contains('734 pages').should('be.visible')
    cy.contains('Fantasy').should('be.visible')
    cy.contains('Young Adult').should('be.visible')
  })

  it('should handle books without series correctly', () => {
    cy.contains('Standalone').should('be.visible')
    cy.contains('Hitchhiker').should('be.visible')
    cy.contains('Douglas Adams').should('be.visible')
    cy.contains('Science Fiction').should('be.visible')
  })

  it('should display library statistics', () => {
    cy.contains('3 books across 2 series').should('be.visible')
    cy.contains('1 series').should('be.visible')
    cy.contains('1 standalone books').should('be.visible')
  })
})