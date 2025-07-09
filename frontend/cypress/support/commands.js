// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Custom command to navigate to a page
Cypress.Commands.add('navigateTo', (page) => {
  cy.get('nav').within(() => {
    cy.contains(page).click()
  })
  cy.url().should('include', page.toLowerCase())
})

// Custom command to wait for loading to complete
Cypress.Commands.add('waitForLoad', () => {
  cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist')
})

// Custom command to check for toast messages
Cypress.Commands.add('checkToast', (message, type = 'success') => {
  cy.get('[data-testid="toast"]', { timeout: 5000 })
    .should('be.visible')
    .and('contain.text', message)
    .and('have.class', `toast-${type}`)
})

// Custom command to search for books
Cypress.Commands.add('searchBooks', (query) => {
  cy.get('[data-testid="search-input"]').clear().type(query)
  cy.get('[data-testid="search-button"]').click()
})