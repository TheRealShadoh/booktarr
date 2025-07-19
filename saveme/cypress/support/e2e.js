// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log for cleaner output
Cypress.on('window:before:load', (win) => {
  const originalFetch = win.fetch
  win.fetch = (...args) => {
    return originalFetch(...args).then((response) => {
      if (!response.ok) {
        console.log('Fetch request failed:', args[0], response.status)
      }
      return response
    })
  }
})


// Custom command to reset settings
Cypress.Commands.add('resetSettings', () => {
  cy.request('POST', `${Cypress.env('apiUrl')}/settings/reset`)
})

// Custom command to check if element exists
Cypress.Commands.add('elementExists', (selector) => {
  return cy.get('body').then(($body) => {
    return $body.find(selector).length > 0
  })
})