describe('App Startup and Basic Functionality', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err, runnable) => {
      // returning false here prevents Cypress from failing the test
      return false
    })
    cy.visit('/')
  })

  it('should load the application successfully', () => {
    cy.wait(5000)
    cy.get('body').then(($body) => {
      cy.log('Page content:', $body.text())
    })
    cy.title().should('contain', 'Booktarr')
  })

  it('should display the library page by default', () => {
    cy.url().should('not.include', '/settings')
    cy.contains('Your Library').should('be.visible')
    cy.get('[data-testid="search-input"]').should('be.visible')
  })

  it('should load test books successfully', () => {
    cy.waitForLoad()
    cy.get('h2').contains('Harry Potter').should('be.visible')
    cy.get('h2').contains('Standalone').should('be.visible')
    cy.contains('books across').should('be.visible')
  })

  it('should display book cards with correct information', () => {
    cy.waitForLoad()
    cy.contains('Harry Potter and the Sorcerer\'s Stone').should('be.visible')
    cy.contains('J.K. Rowling').should('be.visible')
    cy.contains('Harry Potter #1').should('be.visible')
    cy.contains('309 pages').should('be.visible')
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
    cy.contains('Expand All').should('be.visible')
    cy.contains('Collapse All').should('be.visible')
    cy.contains('Harry Potter').should('be.visible')
  })
})