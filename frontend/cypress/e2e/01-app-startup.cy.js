describe('App Startup and Basic Functionality', () => {
  beforeEach(() => {
    cy.waitForAPI()
    cy.resetSettings()
    cy.visit('/')
  })

  it('should load the application successfully', () => {
    cy.contains('📚 Booktarr').should('be.visible')
    cy.contains('Library').should('be.visible')
    cy.contains('Settings').should('be.visible')
  })

  it('should display the library page by default', () => {
    cy.url().should('not.include', '/settings')
    cy.contains('Your Library').should('be.visible')
    cy.get('[data-testid="search-input"]').should('be.visible')
  })

  it('should load test books successfully', () => {
    cy.waitForLoad()
    cy.contains('Harry Potter').should('be.visible')
    cy.contains('Standalone').should('be.visible')
    cy.contains('books across').should('be.visible')
  })

  it('should display book cards with correct information', () => {
    cy.waitForLoad()
    cy.contains('Harry Potter and the Goblet of Fire').should('be.visible')
    cy.contains('J.K. Rowling').should('be.visible')
    cy.contains('Harry Potter #4').should('be.visible')
    cy.contains('734 pages').should('be.visible')
  })

  it('should have working navigation between pages', () => {
    cy.navigateTo('Settings')
    cy.contains('Settings').should('be.visible')
    cy.contains('Skoolib Configuration').should('be.visible')
    
    cy.navigateTo('Library')
    cy.contains('Your Library').should('be.visible')
  })

  it('should handle refresh functionality', () => {
    cy.waitForLoad()
    cy.contains('Refresh').click()
    cy.waitForLoad()
    cy.contains('Harry Potter').should('be.visible')
  })
})